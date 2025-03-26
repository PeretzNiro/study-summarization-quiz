import React, { useState, useEffect } from 'react';
import {
  Heading, 
  Flex, 
  Card, 
  Button, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody,
  Pagination,
  SearchField,
  SelectField,
  Loader,
  Alert,
  Badge,
  Accordion,
  TextField,
  TextAreaField,
  CheckboxField,
} from '@aws-amplify/ui-react';
import { CustomModal } from '../../ui/modal/CustomModal';
import { ActionMessage } from './types';

interface QuizQuestionsTabProps {
  getAuthenticatedClient: () => Promise<any>;  // Function to get authenticated API client
  courses: any[];                              // Available courses data
  lectures: any[];                             // Available lectures data
  courseFilter: string;                        // Initial course filter value
}

/**
 * Quiz questions management tab for approving and editing quiz content
 * Provides filtering, searching, and detailed editing capabilities
 */
const QuizQuestionsTab: React.FC<QuizQuestionsTabProps> = ({ 
  getAuthenticatedClient,
  courses,
  lectures,
  courseFilter,
}) => {
  // State for quiz questions
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questionPage, setQuestionPage] = useState(1);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionCourseFilter, setQuestionCourseFilter] = useState<string>(courseFilter);
  const [questionLectureFilter, setQuestionLectureFilter] = useState<string>('');
  const [filteredLectures, setFilteredLectures] = useState<any[]>([]);
  const questionsPerPage = 10;

  // State for edit modal
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  // Track questions currently being approved with loading indicators
  const [approvingQuestions, setApprovingQuestions] = useState<Record<string, boolean>>({});

  // User feedback messages
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  // Data refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with parent component's course filter
  useEffect(() => {
    setQuestionCourseFilter(courseFilter);
  }, [courseFilter]);

  /**
   * Fetch quiz questions from the database with optional filtering
   */
  useEffect(() => {
    async function fetchQuizQuestions() {
      try {
        setQuestionsLoading(true);
        setQuestionsError(null);
        
        // Build filter based on selected course and lecture
        let filter: any = {};
        if (questionCourseFilter) {
          filter.courseId = { eq: questionCourseFilter };
        }
        if (questionLectureFilter) {
          filter.lectureId = { eq: questionLectureFilter };
        }
        
        const authClient = await getAuthenticatedClient();
        const { data, errors } = await authClient.models.QuizQuestion.list({
          filter: Object.keys(filter).length > 0 ? filter : undefined
        });
        
        if (errors) {
          throw new Error(errors[0].message);
        }
        
        setQuizQuestions(data || []);
      } catch (error) {
        console.error('Error fetching quiz questions:', error);
        setQuestionsError('Failed to load quiz questions');
      } finally {
        setQuestionsLoading(false);
      }
    }
    
    // Update filtered lectures when course filter changes
    if (questionCourseFilter) {
      const filtered = lectures.filter(lecture => 
        lecture.courseId === questionCourseFilter
      );
      setFilteredLectures(filtered);
    } else {
      setFilteredLectures([]);
    }
    
    fetchQuizQuestions();
  }, [questionCourseFilter, questionLectureFilter, lectures, getAuthenticatedClient]);

  // Filter quiz questions by search term and sort by approval status and date
  const filteredQuestions = quizQuestions
    .filter(question => 
      question.question?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      question.topicTag?.toLowerCase().includes(questionSearch.toLowerCase())
    )
    .sort((a, b) => {
      // Show pending questions first
      if (a.isApproved && !b.isApproved) return 1;
      if (!a.isApproved && b.isApproved) return -1;
      
      // Then sort by creation date (newest first)
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

  // Paginate filtered questions
  const paginatedQuestions = filteredQuestions.slice(
    (questionPage - 1) * questionsPerPage,
    questionPage * questionsPerPage
  );

  /**
   * Mark a question as approved in the database
   * @param questionId ID of the question to approve
   */
  const approveQuestion = async (questionId: string) => {
    try {
      // Track loading state for this specific question
      setApprovingQuestions(prev => ({ ...prev, [questionId]: true }));
      
      const authClient = await getAuthenticatedClient();
      await authClient.models.QuizQuestion.update({
        id: questionId,
        reviewStatus: 'Approved',
        isApproved: true
      });
      
      // Update local state with approved question
      setQuizQuestions(quizQuestions.map(question => 
        question.id === questionId 
          ? { ...question, reviewStatus: 'Approved', isApproved: true }
          : question
      ));
      
      // Show temporary success message
      setActionMessage({ text: 'Question approved successfully', type: 'success' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error('Error approving question:', error);
      setActionMessage({ text: 'Failed to approve question', type: 'error' });
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      // Clear loading state for this question
      setApprovingQuestions(prev => {
        const newState = { ...prev };
        delete newState[questionId];
        return newState;
      });
    }
  };

  /**
   * Save changes to a question in the database
   * @param event Form submission event
   */
  const handleQuestionUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      // Normalize difficulty value for consistency
      const formattedDifficulty = editingQuestion.difficulty?.toLowerCase() === 'easy' ? 'Easy' :
                                editingQuestion.difficulty?.toLowerCase() === 'medium' ? 'Medium' :
                                editingQuestion.difficulty?.toLowerCase() === 'hard' ? 'Hard' :
                                'Medium'; // Default
      
      const authClient = await getAuthenticatedClient();
      await authClient.models.QuizQuestion.update({
        id: editingQuestion.id,
        courseId: editingQuestion.courseId,
        lectureId: editingQuestion.lectureId,
        question: editingQuestion.question,
        options: editingQuestion.options,
        answer: editingQuestion.answer,
        explanation: editingQuestion.explanation || '',
        difficulty: formattedDifficulty,
        topicTag: editingQuestion.topicTag || '',
        reviewStatus: editingQuestion.reviewStatus || 'pending',
        isApproved: editingQuestion.isApproved || false
      });
      
      // Update local state with edited question
      const updatedQuestion = {
        ...editingQuestion,
        difficulty: formattedDifficulty
      };
      
      setQuizQuestions(quizQuestions.map(question => 
        question.id === editingQuestion.id ? updatedQuestion : question
      ));
      
      // Close modal and reset form
      setIsQuestionModalOpen(false);
      setEditingQuestion(null);
      
      setActionMessage({ text: 'Question updated successfully', type: 'success' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating question:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      setActionMessage({ text: `Failed to update question: ${errorMessage}`, type: 'error' });
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  /**
   * Add a new empty option to the question being edited
   */
  const addOption = () => {
    if (!editingQuestion) return;
    const options = [...editingQuestion.options || [], ''];
    setEditingQuestion({...editingQuestion, options});
  };
  
  /**
   * Remove an option from the question being edited
   * Also updates the answer if the removed option was the correct answer
   */
  const removeOption = (index: number) => {
    if (!editingQuestion) return;
    const options = [...editingQuestion.options];
    
    // Check if removing the correct answer
    let answer = editingQuestion.answer;
    if (answer === editingQuestion.options[index]) {
      answer = '';
    }
    
    // Remove the option
    options.splice(index, 1);
    
    setEditingQuestion({
      ...editingQuestion, 
      options, 
      answer
    });
  };
  
  /**
   * Update an option's text in the question being edited
   * Also updates the answer if this option was the correct answer
   */
  const updateOption = (index: number, value: string) => {
    if (!editingQuestion) return;
    const options = [...editingQuestion.options];
    
    // Check if updating the correct answer
    let answer = editingQuestion.answer;
    if (answer === editingQuestion.options[index]) {
      answer = value;
    }
    
    // Update the option
    options[index] = value;
    
    setEditingQuestion({
      ...editingQuestion, 
      options, 
      answer
    });
  };

  /**
   * Refresh the questions list from the database
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      setQuestionsLoading(true);
      setQuestionsError(null);
      
      // Apply same filters as before
      let filter: any = {};
      if (questionCourseFilter) {
        filter.courseId = { eq: questionCourseFilter };
      }
      if (questionLectureFilter) {
        filter.lectureId = { eq: questionLectureFilter };
      }
      
      const authClient = await getAuthenticatedClient();
      const { data, errors } = await authClient.models.QuizQuestion.list({
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      if (errors) {
        throw new Error(errors[0].message);
      }
      
      setQuizQuestions(data || []);
    } catch (error) {
      console.error('Error refreshing quiz questions:', error);
      setQuestionsError('Failed to refresh quiz questions');
    } finally {
      setQuestionsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Renders the question edit modal with form fields
   */
  const renderQuestionEditModal = () => (
    <CustomModal
      isOpen={isQuestionModalOpen}
      onClose={() => {
        setIsQuestionModalOpen(false);
        setEditingQuestion(null);
      }}
    >
      <div className="custom-modal-content">
        <Heading level={3}>Edit Quiz Question</Heading>
        
        {editingQuestion && (
          <form onSubmit={handleQuestionUpdate}>
            {/* Question text */}
            <TextAreaField
              label="Question"
              name="question"
              rows={2}
              value={editingQuestion.question || ''}
              onChange={e => setEditingQuestion({...editingQuestion, question: e.target.value})}
              required
              marginBottom="1rem"
            />
            
            {/* Answer options section */}
            <Heading level={5} marginTop="1rem" marginBottom="0.5rem">Options</Heading>
            {editingQuestion.options?.map((option: string, index: number) => (
              <Flex key={index} alignItems="center" marginBottom="0.5rem">
                <TextField
                  label={`Option ${index + 1}`}
                  labelHidden
                  name={`option-${index}`}
                  value={option}
                  onChange={e => updateOption(index, e.target.value)}
                  required
                  flex="1"
                />
                
                {/* Correct answer selection */}
                <CheckboxField
                  label="Correct Answer"
                  name={`correct-${index}`}
                  value={option}
                  checked={editingQuestion.answer === option}
                  onChange={() => setEditingQuestion({...editingQuestion, answer: option})}
                  marginLeft="0.5rem"
                />
                
                {/* Option removal button */}
                <Button
                  variation="destructive"
                  size="small"
                  onClick={() => removeOption(index)}
                  marginLeft="0.5rem"
                  disabled={editingQuestion.options.length <= 2}
                >
                  Remove
                </Button>
              </Flex>
            ))}
            
            {/* Add option button - limited to 6 options */}
            {editingQuestion.options?.length < 6 && (
              <Button
                onClick={addOption}
                size="small"
                marginBottom="1rem"
              >
                + Add Option
              </Button>
            )}
            
            {/* Explanation field */}
            <TextAreaField
              label="Explanation"
              name="explanation"
              rows={3}
              value={editingQuestion.explanation || ''}
              onChange={e => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
              marginBottom="1rem"
            />
            
            {/* Metadata fields */}
            <Flex gap="1rem">
              <SelectField
                label="Difficulty"
                name="difficulty"
                value={editingQuestion.difficulty?.toLowerCase() || 'medium'}
                onChange={e => setEditingQuestion({...editingQuestion, difficulty: e.target.value})}
                flex="1"
                marginBottom="1rem"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </SelectField>
              
              <TextField
                label="Topic Tag"
                name="topicTag"
                value={editingQuestion.topicTag || ''}
                onChange={e => setEditingQuestion({...editingQuestion, topicTag: e.target.value})}
                flex="1"
                marginBottom="1rem"
              />
            </Flex>
            
            {/* Action buttons */}
            <Flex justifyContent="space-between">
              <Button 
                variation="link" 
                onClick={() => {
                  setIsQuestionModalOpen(false);
                  setEditingQuestion(null);
                }}
              >
                Cancel
              </Button>
              <Flex gap="1rem">
                {/* Combined approve and save button for pending questions */}
                {!editingQuestion.isApproved && (
                  <Button 
                    variation="warning"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingQuestion({
                        ...editingQuestion, 
                        reviewStatus: 'Approved',
                        isApproved: true
                      });
                    }}
                  >
                    Approve & Save
                  </Button>
                )}
                <Button type="submit" variation="primary">Save Changes</Button>
              </Flex>
            </Flex>
          </form>
        )}
      </div>
    </CustomModal>
  );

  return (
    <Card className='radius overflow-x-scroll'>
      <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="1rem">
        <Heading level={4}>Quiz Questions</Heading>
        
        {/* Refresh button */}
        <Button
          variation="link"
          size="small"
          onClick={handleRefresh}
          isLoading={isRefreshing}
          loadingText="Refreshing..."
        >
          {isRefreshing ? "Refreshing..." : "↻ Refresh"}
        </Button>
      </Flex>
      
      {/* Status and error messages */}
      {actionMessage && (
        <Alert 
          className='radius-s'
          variation={actionMessage.type} 
          isDismissible={true}
          onDismiss={() => setActionMessage(null)}
          marginBottom="1rem"
        >
          {actionMessage.text}
        </Alert>
      )}
      
      {/* Filter controls */}
      <Flex justifyContent="space-between" marginBottom="1rem">
        <Flex direction="row" gap="1rem">
          {/* Course filter */}
          <SelectField
            label="Filter by Course"
            labelHidden
            value={questionCourseFilter}
            onChange={e => setQuestionCourseFilter(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course.courseId} value={course.courseId}>
                {course.courseId} - {course.title}
              </option>
            ))}
          </SelectField>
          
          {/* Lecture filter - only enabled when course is selected */}
          <SelectField
            label="Filter by Lecture"
            labelHidden
            value={questionLectureFilter}
            onChange={e => setQuestionLectureFilter(e.target.value)}
            disabled={filteredLectures.length === 0}
          >
            <option value="">All Lectures</option>
            {filteredLectures.map(lecture => (
              <option key={lecture.lectureId} value={lecture.lectureId}>
                {lecture.lectureId} - {lecture.title}
              </option>
            ))}
          </SelectField>
        </Flex>
        
        {/* Search field */}
        <SearchField
          label="Search questions"
          placeholder="Search by question or topic"
          value={questionSearch}
          onChange={e => setQuestionSearch(e.target.value)}
          onClear={() => setQuestionSearch('')}
          hasSearchButton={false}
          hasSearchIcon
        />
      </Flex>

      {/* Loading and empty states */}
      {questionsLoading ? (
        <Flex justifyContent="center" padding="2rem">
          <Loader size="large" />
        </Flex>
      ) : questionsError ? (
        <Alert className='radius-s' variation="error">{questionsError}</Alert>
      ) : paginatedQuestions.length === 0 ? (
        <Alert className='radius-s' variation="info">No quiz questions found</Alert>
      ) : (
        <>
          {/* Questions table */}
          <Table highlightOnHover>
            <TableHead>
              <TableRow>
                <TableCell as="th">Question</TableCell>
                <TableCell as="th">Difficulty</TableCell>
                <TableCell as="th">Topic</TableCell>
                <TableCell as="th">Status</TableCell>
                <TableCell as="th">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{paginatedQuestions.map(question => (
              <TableRow key={question.id}>
                {/* Truncated question text */}
                <TableCell>{question.question?.substring(0, 60)}...</TableCell>
                
                {/* Difficulty with color coding */}
                <TableCell>
                  <Badge
                    variation={
                      question.difficulty?.toLowerCase() === 'easy' ? 'info' :
                      question.difficulty?.toLowerCase() === 'medium' ? 'warning' : 'error'
                    }
                  >
                    {question.difficulty}
                  </Badge>
                </TableCell>
                
                <TableCell>{question.topicTag || 'General'}</TableCell>
                
                {/* Approval status badge */}
                <TableCell>
                  {question.isApproved ? 
                    <Badge variation="success">Approved</Badge> : 
                    <Badge variation="warning">Pending</Badge>
                  }
                </TableCell>
                
                {/* Action buttons */}
                <TableCell>
                  <Flex gap="0.5rem">
                    {/* Approve button - only shown for pending questions */}
                    {!question.isApproved && (
                      <Button 
                        variation="primary" 
                        size="small"
                        onClick={() => approveQuestion(question.id)}
                        isLoading={approvingQuestions[question.id] || false}
                        loadingText="Approving..."
                      >
                        Approve
                      </Button>
                    )}
                    
                    {/* Edit button */}
                    <Button
                      variation="warning"
                      size="small"
                      onClick={() => {
                        setEditingQuestion(question);
                        setIsQuestionModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    
                    {/* Expandable details section */}
                    <Accordion>
                      <Accordion.Container>
                        <Accordion.Item value="details">
                          <Accordion.Trigger>
                            Details
                            <Accordion.Icon />
                          </Accordion.Trigger>
                          <Accordion.Content>
                            <div className="question-details">
                              <h4>Question</h4>
                              <p>{question.question}</p>
                              
                              <h4>Options</h4>
                              <ul>
                                {question.options?.map((option: string, index: number) => (
                                  <li 
                                    key={index} 
                                    className={option === question.answer ? 'correct-answer' : ''}
                                  >
                                    {option} {option === question.answer && '✓'}
                                  </li>
                                ))}
                              </ul>
                              
                              <h4>Explanation</h4>
                              <p>{question.explanation || 'No explanation provided.'}</p>
                            </div>
                          </Accordion.Content>
                        </Accordion.Item>
                      </Accordion.Container>
                    </Accordion>
                  </Flex>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
          
          {/* Pagination controls */}
          <Pagination
            currentPage={questionPage}
            totalPages={Math.ceil(filteredQuestions.length / questionsPerPage)}
            onNext={() => setQuestionPage(p => Math.min(p + 1, Math.ceil(filteredQuestions.length / questionsPerPage)))}
            onPrevious={() => setQuestionPage(p => Math.max(p - 1, 1))}
            onChange={newPage => setQuestionPage(newPage ?? 1)}
          />
        </>
      )}

      {/* Question edit modal */}
      {renderQuestionEditModal()}
    </Card>
  );
};

export default QuizQuestionsTab;