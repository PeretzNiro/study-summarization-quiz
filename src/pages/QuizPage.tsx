import React from 'react';
import { Link, useParams } from 'react-router-dom';
import QuizContainer from '../components/quiz/QuizContainer';

const QuizPage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  
  if (!courseId || !lectureId) {
    return (
      <div className="error-container">
        <p>Missing required course or lecture information.</p>
        <Link to="/courses" className="btn btn-primary">
          Return to Courses
        </Link>
      </div>
    );
  }
  
  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <Link to={`/courses/${courseId}/lectures/${lectureId}`} className="back-link">
          ← Back to Lecture
        </Link>
        <h1>Quiz Assessment</h1>
      </div>
      
      <QuizContainer courseID={courseId} lectureID={lectureId} />
    </div>
  );
};

export default QuizPage;