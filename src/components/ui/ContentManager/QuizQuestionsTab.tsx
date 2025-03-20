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
  getAuthenticatedClient: () => Promise<any>;
  courses: any[];
  lectures: any[];
  courseFilter: string;
}

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

  // Add a new state for tracking questions being approved
  const [approvingQuestions, setApprovingQuestions] = useState<Record<string, boolean>>({});

  // Add state for success/error/info messages
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  useEffect(() => {
    setQuestionCourseFilter(courseFilter);
  }, [courseFilter]);

  // Fetch quiz questions when filters change
  useEffect(() => {
    async function fetchQuizQuestions() {
      try {
        setQuestionsLoading(true);
        setQuestionsError(null);
        
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
          console.error('GraphQL errors:', errors);
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
    
    // Update filtered lectures for question tab
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

  // Filter quiz questions by search term
  const filteredQuestions = quizQuestions.filter(question => 
    question.question?.toLowerCase().includes(questionSearch.toLowerCase()) ||
    question.topicTag?.toLowerCase().includes(questionSearch.toLowerCase())
  );

  // Paginate quiz questions
  const paginatedQuestions = filteredQuestions.slice(
    (questionPage - 1) * questionsPerPage,
    questionPage * questionsPerPage
  );

  // Update the approveQuestion function
  const approveQuestion = async (questionId: string) => {
    try {
      // Set loading state for this specific question
      setApprovingQuestions(prev => ({ ...prev, [questionId]: true }));
      
      const authClient = await getAuthenticatedClient();
      await authClient.models.QuizQuestion.update({
        id: questionId,
        reviewStatus: 'Approved', // Capitalize for storage
        isApproved: true
      });
      
      // Update local state
      setQuizQuestions(quizQuestions.map(question => 
        question.id === questionId 
          ? { ...question, reviewStatus: 'Approved', isApproved: true }
          : question
      ));
      
      // Show success message
      setActionMessage({ text: 'Question approved successfully', type: 'success' });
      
      // Auto-hide message after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error('Error approving question:', error);
      setActionMessage({ text: 'Failed to approve question', type: 'error' });
      
      // Auto-hide message after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      // Clear loading state
      setApprovingQuestions(prev => {
        const newState = { ...prev };
        delete newState[questionId];
        return newState;
      });
    }
  };

  // Add this function to handle question updates
  const handleQuestionUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      // Convert difficulty to proper case for storage
      const formattedDifficulty = editingQuestion.difficulty?.toLowerCase() === 'easy' ? 'Easy' :
                                editingQuestion.difficulty?.toLowerCase() === 'medium' ? 'Medium' :
                                editingQuestion.difficulty?.toLowerCase() === 'hard' ? 'Hard' :
                                'Medium'; // Default
      
      const authClient = await getAuthenticatedClient();
      const result = await authClient.models.QuizQuestion.update({
        id: editingQuestion.id,
        courseId: editingQuestion.courseId,
        lectureId: editingQuestion.lectureId,
        question: editingQuestion.question,
        options: editingQuestion.options,
        answer: editingQuestion.answer,
        explanation: editingQuestion.explanation || '',
        difficulty: formattedDifficulty, // Use the formatted version
        topicTag: editingQuestion.topicTag || '',
        reviewStatus: editingQuestion.reviewStatus || 'pending',
        isApproved: editingQuestion.isApproved || false
      });
      
      console.log("Update result:", result);
      
      // Update local state with the properly formatted difficulty
      const updatedQuestion = {
        ...editingQuestion,
        difficulty: formattedDifficulty
      };
      
      setQuizQuestions(quizQuestions.map(question => 
        question.id === editingQuestion.id ? updatedQuestion : question
      ));
      
      // Close modal and reset
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

  const addOption = () => {
    if (!editingQuestion) return;
    const options = [...editingQuestion.options || [], ''];
    setEditingQuestion({...editingQuestion, options});
  };
  
  const removeOption = (index: number) => {
    if (!editingQuestion) return;
    const options = [...editingQuestion.options];
    options.splice(index, 1);
    
    // If removed option was the answer, reset answer
    let answer = editingQuestion.answer;
    if (answer === editingQuestion.options[index]) {
      answer = '';
    }
    
    setEditingQuestion({
      ...editingQuestion, 
      options, 
      answer
    });
  };
  
  const updateOption = (index: number, value: string) => {
    if (!editingQuestion) return;
    const options = [...editingQuestion.options];
    options[index] = value;
    
    // Update answer if it was the same as the old option
    let answer = editingQuestion.answer;
    if (answer === editingQuestion.options[index]) {
      answer = value;
    }
    
    setEditingQuestion({
      ...editingQuestion, 
      options, 
      answer
    });
  };

  // Render question edit modal
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
            <TextAreaField
              label="Question"
              name="question"
              rows={2}
              value={editingQuestion.question || ''}
              onChange={e => setEditingQuestion({...editingQuestion, question: e.target.value})}
              required
              marginBottom="1rem"
            />
            
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
                
                <CheckboxField
                  label="Correct Answer"
                  name={`correct-${index}`}
                  value={option}
                  checked={editingQuestion.answer === option}
                  onChange={() => setEditingQuestion({...editingQuestion, answer: option})}
                  marginLeft="0.5rem"
                />
                
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
            
            {editingQuestion.options?.length < 6 && (
              <Button
                onClick={addOption}
                size="small"
                marginBottom="1rem"
              >
                + Add Option
              </Button>
            )}
            
            <TextAreaField
              label="Explanation"
              name="explanation"
              rows={3}
              value={editingQuestion.explanation || ''}
              onChange={e => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
              marginBottom="1rem"
            />
            
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
      <Heading level={4} marginBottom="1rem">Quiz Questions</Heading>
      
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
      
      <Flex justifyContent="space-between" marginBottom="1rem">
        <Flex direction="row" gap="1rem">
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
                <TableCell>{question.question?.substring(0, 60)}...</TableCell>
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
                <TableCell>
                  {question.isApproved ? 
                    <Badge variation="success">Approved</Badge> : 
                    <Badge variation="warning">Pending</Badge>
                  }
                </TableCell>
                <TableCell>
                  <Flex gap="0.5rem">
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
          
          <Pagination
            currentPage={questionPage}
            totalPages={Math.ceil(filteredQuestions.length / questionsPerPage)}
            onNext={() => setQuestionPage(p => Math.min(p + 1, Math.ceil(filteredQuestions.length / questionsPerPage)))}
            onPrevious={() => setQuestionPage(p => Math.max(p - 1, 1))}
            onChange={newPage => setQuestionPage(newPage ?? 1)}
          />
        </>
      )}

      {/* Add the modal here */}
      {renderQuestionEditModal()}
    </Card>
  );
};

export default QuizQuestionsTab;