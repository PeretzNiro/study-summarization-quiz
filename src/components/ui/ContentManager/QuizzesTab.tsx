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
  Text,
  CheckboxField
} from '@aws-amplify/ui-react';
import { ActionMessage } from './types';

interface QuizzesTabProps {
  getAuthenticatedClient: () => Promise<any>;
  courses: any[];
  lectures: any[];
  courseFilter: string;
}

const QuizzesTab: React.FC<QuizzesTabProps> = ({
  getAuthenticatedClient,
  courses,
  lectures,
  courseFilter
}) => {
  // State for quizzes
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizPage, setQuizPage] = useState(1);
  const [quizCourseFilter, setQuizCourseFilter] = useState<string>(courseFilter);
  const [quizLectureFilter, setQuizLectureFilter] = useState<string>('');
  const [quizSearch, setQuizSearch] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [filteredAvailableQuestions, setFilteredAvailableQuestions] = useState<any[]>([]);
  const [questionFilterSearch, setQuestionFilterSearch] = useState('');
  const quizzesPerPage = 10;

  // Action messages
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  useEffect(() => {
    setQuizCourseFilter(courseFilter);
  }, [courseFilter]);

  // Fetch quizzes when filters change
  useEffect(() => {
    async function fetchQuizzes() {
      try {
        setQuizLoading(true);
        setQuizError(null);
        
        let filter: any = {};
        if (quizCourseFilter) {
          filter.courseId = { eq: quizCourseFilter };
        }
        if (quizLectureFilter) {
          filter.lectureId = { eq: quizLectureFilter };
        }
        
        const authClient = await getAuthenticatedClient();
        const { data, errors } = await authClient.models.Quiz.list({
          filter: Object.keys(filter).length > 0 ? filter : undefined
        });
        
        if (errors) {
          throw new Error('Failed to fetch quizzes');
        }
        
        setQuizzes(data || []);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        setQuizError('Failed to load quizzes');
      } finally {
        setQuizLoading(false);
      }
    }
    
    fetchQuizzes();
  }, [quizCourseFilter, quizLectureFilter, getAuthenticatedClient]);

  // Filter quizzes by search term
  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title?.toLowerCase().includes(quizSearch.toLowerCase()) ||
    quiz.quizId?.toLowerCase().includes(quizSearch.toLowerCase())
  );

  // Paginate quizzes
  const paginatedQuizzes = filteredQuizzes.slice(
    (quizPage - 1) * quizzesPerPage,
    quizPage * quizzesPerPage
  );

  // Update the handleQuizSelect function
  const handleQuizSelect = async (quiz: any) => {
    setSelectedQuiz(quiz);
    const questionIds = quiz.questionIds || [];
    setSelectedQuestions(questionIds);
    
    console.log("Selected quiz:", quiz);
    console.log("Question IDs:", questionIds);
    
    try {
      const authClient = await getAuthenticatedClient();
      
      // First try - fetch ALL questions for this course/lecture
      let filter = {
        and: [
          { courseId: { eq: quiz.courseId } },
          { lectureId: { eq: quiz.lectureId } }
        ]
      };
      
      console.log("Fetching ALL questions with course/lecture filter:", filter);
      let result = await authClient.models.QuizQuestion.list({ filter });
      
      if (!result.data || result.data.length === 0) {
        console.log("No questions found with course/lecture filter, trying with just courseId");
        
        // Try with just courseId
        filter = { and: [{ courseId: { eq: quiz.courseId } }] };
        result = await authClient.models.QuizQuestion.list({ filter });
        
        if (!result.data || result.data.length === 0) {
          console.log("No questions found for this course, trying to fetch by IDs");
          
          // If we have questionIds but couldn't find matching questions by course/lecture,
          // try to fetch them directly by ID
          if (questionIds.length > 0) {
            const questionPromises = questionIds.map((id: string) => 
              authClient.models.QuizQuestion.get({ id })
            );
            
            try {
              const questionResults = await Promise.all(questionPromises);
              const validResults = questionResults
                .filter(result => result.data !== null)
                .map(result => result.data);
              
              console.log(`Found ${validResults.length} questions by ID`);
              
              if (validResults.length > 0) {
                // If we found questions by ID, use those
                setAvailableQuestions(validResults);
                setFilteredAvailableQuestions(validResults);
                return;
              }
            } catch (idError) {
              console.error("Error fetching questions by ID:", idError);
            }
          }
          
          // Last resort: fetch all questions
          console.log("Fetching all questions as fallback");
          result = await authClient.models.QuizQuestion.list();
        }
      }
      
      console.log(`Found ${result.data?.length || 0} questions for this course/lecture`);
      
      // Sort questions to put already selected ones first, then by approval status and difficulty
      const sortedQuestions = [...(result.data || [])].sort((a, b) => {
        // First sort by whether question ID is in the quiz's questionIds
        const aInQuiz = questionIds.includes(a.id);
        const bInQuiz = questionIds.includes(b.id);
        if (aInQuiz && !bInQuiz) return -1;
        if (!aInQuiz && bInQuiz) return 1;
        
        // Then sort by approval status
        if (a.isApproved && !b.isApproved) return -1;
        if (!a.isApproved && b.isApproved) return 1;
        
        // Finally sort by difficulty
        const difficultyOrder: Record<string, number> = { 'easy': 0, 'medium': 1, 'hard': 2 };
        const aDifficulty = (a.difficulty?.toLowerCase() || 'medium') as string;
        const bDifficulty = (b.difficulty?.toLowerCase() || 'medium') as string;
        return (difficultyOrder[aDifficulty] || 1) - (difficultyOrder[bDifficulty] || 1);
      });
      
      setAvailableQuestions(sortedQuestions);
      setFilteredAvailableQuestions(sortedQuestions);
      
    } catch (error) {
      console.error('Error fetching available questions:', error);
      setActionMessage({
        text: `Failed to load questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Handle checkbox change when selecting/deselecting questions
  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestions([...selectedQuestions, questionId]);
    } else {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
    }
  };

  // Save updated quiz questions
  const handleSaveQuiz = async () => {
    if (!selectedQuiz) return;
    
    try {
      const authClient = await getAuthenticatedClient();
      await authClient.models.Quiz.update({
        id: selectedQuiz.id,
        questionIds: selectedQuestions
      });
      
      // Update local quiz data
      const updatedQuizzes = quizzes.map(quiz => 
        quiz.id === selectedQuiz.id ? { ...quiz, questionIds: selectedQuestions } : quiz
      );
      setQuizzes(updatedQuizzes);
      
      // Reset selection
      setSelectedQuiz(null);
      setSelectedQuestions([]);
      
      setActionMessage({ 
        text: 'Quiz questions updated successfully', 
        type: 'success' 
      });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error('Error updating quiz:', error);
      setActionMessage({ 
        text: 'Failed to update quiz questions', 
        type: 'error' 
      });
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <Card className='radius overflow-x-scroll'>
      <Heading level={4} marginBottom="1rem">Manage Quizzes</Heading>
      
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
      
      {selectedQuiz ? (
        <div className="quiz-editor">
          <Heading level={5}>
            Editing Quiz: {selectedQuiz.title} ({selectedQuiz.quizId})
          </Heading>
          <Text marginBottom="1rem">
            Course: {selectedQuiz.courseId} | Lecture: {selectedQuiz.lectureId}
          </Text>
          
          <Alert className='radius-s' variation="info" marginBottom="1rem">
            Select the questions you want to include in this quiz.
          </Alert>
          
          <div className="question-selector">
            {availableQuestions.length === 0 ? (
              <div>
                <Alert className='radius-s' variation="warning" marginBottom="1rem">
                  No questions available for this lecture.
                </Alert>
                
                <Text marginBottom="1rem">
                  Possible solutions:
                  <ul>
                    <li>Generate quiz questions for this lecture first</li>
                    <li>Create questions manually through the Quiz Questions tab</li>
                    <li>Check that the lecture ID format matches between quizzes and questions</li>
                  </ul>
                </Text>
                
                <Flex justifyContent="center" marginTop="1rem">
                  <Button 
                    variation="primary"
                    onClick={async () => {
                      try {
                        // Show all questions regardless of lecture
                        const authClient = await getAuthenticatedClient();
                        const result = await authClient.models.QuizQuestion.list();
                        
                        console.log(`Found ${result.data?.length || 0} total questions`);
                        setAvailableQuestions(result.data || []);
                        setFilteredAvailableQuestions(result.data || []);
                        
                        setActionMessage({
                          text: `Showing all ${result.data?.length || 0} questions in the system`,
                          type: 'info'
                        });
                        setTimeout(() => setActionMessage(null), 5000);
                      } catch (error) {
                        console.error("Error fetching all questions:", error);
                      }
                    }}
                  >
                    Show All Available Questions
                  </Button>
                </Flex>
              </div>
            ) : (
              <>
                <Flex className='flex-wrap' justifyContent="space-between" marginBottom="1rem">
                  <Text>
                    <strong>Selected:</strong> {selectedQuestions.length} questions | 
                    <strong> Available:</strong> {availableQuestions.length} questions
                  </Text>
                  
                  <Button 
                    size="small"
                    onClick={() => {
                      // Add all questions to the quiz
                      setSelectedQuestions(availableQuestions.map(q => q.id));
                    }}
                  >
                    Select All
                  </Button>
                </Flex>
                
                <SearchField
                  label="Search questions"
                  placeholder="Filter questions by text or topic"
                  marginBottom="1rem"
                  value={questionFilterSearch}
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    setQuestionFilterSearch(e.target.value);
                    
                    if (!searchTerm) {
                      setFilteredAvailableQuestions(availableQuestions);
                      return;
                    }
                    
                    // Filter questions but keep the same order
                    const filtered = availableQuestions.filter(q => 
                      q.question?.toLowerCase().includes(searchTerm) || 
                      q.topicTag?.toLowerCase().includes(searchTerm)
                    );
                    
                    // Sort filtered questions
                    filtered.sort((a, b) => {
                      const aSelected = selectedQuestions.includes(a.id);
                      const bSelected = selectedQuestions.includes(b.id);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return 0;
                    });
                    
                    // Update filtered questions instead of original questions
                    setFilteredAvailableQuestions(filtered);
                  }}
                  onClear={() => {
                    setQuestionFilterSearch('');
                    setFilteredAvailableQuestions(availableQuestions);
                  }}
                  hasSearchButton={false}
                  hasSearchIcon
                />
                
                <div className="question-list" style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem', border: '1px solid #e4e4e4', borderRadius: '8px' }}>
                  {filteredAvailableQuestions.map(question => {
                    const isSelected = selectedQuestions.includes(question.id);
                    
                    return (
                      <div key={question.id} className="question-item" style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #e4e4e4',
                        backgroundColor: isSelected ? '#f0f9ff' : 'white'
                      }}>
                        <Flex direction="column" gap="0.25rem">
                          <Flex alignItems="center">
                            <CheckboxField
                              label={
                                <Text fontWeight={isSelected ? 'bold' : 'normal'}>
                                  {question.question?.substring(0, 80) + (question.question?.length > 80 ? '...' : '')}
                                </Text>
                              }
                              name={`question-${question.id}`}
                              value={question.id}
                              checked={isSelected}
                              onChange={e => handleQuestionSelect(question.id, e.target.checked)}
                            />
                          </Flex>
                          
                          <Flex gap="0.5rem" marginLeft="1.5rem">
                            <Badge variation={
                              question.difficulty?.toLowerCase() === 'easy' ? 'info' :
                              question.difficulty?.toLowerCase() === 'medium' ? 'warning' : 'error'
                            }>
                              {question.difficulty}
                            </Badge>
                            
                            {question.topicTag && (
                              <Badge variation="info">{question.topicTag}</Badge>
                            )}
                            
                            {question.isApproved && (
                              <Badge variation="success">Approved</Badge>
                            )}
                            
                            <Text fontSize="xs" color="gray">ID: {question.id.substring(0, 8)}...</Text>
                          </Flex>
                        </Flex>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          
          <Flex justifyContent="space-between" marginTop="1.5rem">
            <Button variation="link" onClick={() => {
              setSelectedQuiz(null);
              setSelectedQuestions([]);
            }}>
              Cancel
            </Button>
            <Button variation="primary" onClick={handleSaveQuiz}>
              Save Quiz Questions
            </Button>
          </Flex>
        </div>
      ) : (
        <>
          <Flex justifyContent="space-between" marginBottom="1rem">
            <Flex direction="row" gap="1rem">
              <SelectField
                label="Course"
                labelHidden
                value={quizCourseFilter}
                onChange={e => {
                  setQuizCourseFilter(e.target.value);
                  setQuizLectureFilter('');
                }}
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course.courseId} value={course.courseId}>
                    {course.courseId} - {course.title}
                  </option>
                ))}
              </SelectField>
              
              <SelectField
                label="Lecture"
                labelHidden
                value={quizLectureFilter}
                onChange={e => setQuizLectureFilter(e.target.value)}
                isDisabled={!quizCourseFilter}
              >
                <option value="">All Lectures</option>
                {lectures
                  .filter(lecture => lecture.courseId === quizCourseFilter)
                  .map(lecture => (
                    <option key={lecture.lectureId} value={lecture.lectureId}>
                      {lecture.title}
                    </option>
                  ))
                }
              </SelectField>
            </Flex>
            
            <SearchField
              label="Search quizzes"
              placeholder="Search by title or ID"
              value={quizSearch}
              onChange={e => setQuizSearch(e.target.value)}
              onClear={() => setQuizSearch('')}
              hasSearchButton={false}
              hasSearchIcon
            />
          </Flex>

          {quizLoading ? (
            <Flex justifyContent="center" padding="2rem">
              <Loader size="large" />
            </Flex>
          ) : quizError ? (
            <Alert className='radius-s' variation="error">{quizError}</Alert>
          ) : paginatedQuizzes.length === 0 ? (
            <Alert className='radius-s' variation="info">No quizzes found</Alert>
          ) : (
            <>
              <Table highlightOnHover>
                <TableHead>
                  <TableRow>
                    <TableCell as="th">Quiz ID</TableCell>
                    <TableCell as="th">Title</TableCell>
                    <TableCell as="th">Type</TableCell>
                    <TableCell as="th">Questions</TableCell>
                    <TableCell as="th">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{paginatedQuizzes.map(quiz => (
                  <TableRow key={quiz.id}>
                    <TableCell>{quiz.quizId}</TableCell>
                    <TableCell>{quiz.title}</TableCell>
                    <TableCell>
                      {quiz.isPersonalized ? 
                        <Badge variation="info">Personalized</Badge> : 
                        <Badge variation="warning">Standard</Badge>
                      }
                    </TableCell>
                    <TableCell>{(quiz.questionIds?.length || 0)} questions</TableCell>
                    <TableCell>
                      <Button
                        variation="primary"
                        size="small"
                        onClick={() => handleQuizSelect(quiz)}
                      >
                        Edit Questions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
              
              <Pagination
                currentPage={quizPage}
                totalPages={Math.ceil(filteredQuizzes.length / quizzesPerPage)}
                onNext={() => setQuizPage(p => Math.min(p + 1, Math.ceil(filteredQuizzes.length / quizzesPerPage)))}
                onPrevious={() => setQuizPage(p => Math.max(p - 1, 1))}
                onChange={newPage => setQuizPage(newPage ?? 1)}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default QuizzesTab;