import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Heading, Text, Button, Flex, View } from '@aws-amplify/ui-react';
import { UserProgress, Course } from '../../types/models';
import { useCourseData } from '../../context/CourseContext';

interface ContinueLearningCardProps {
  courseId: string;
  coursesData: Course[];
  progress: UserProgress;
}

const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({ 
  courseId, 
  coursesData,
  progress 
}) => {
  const navigate = useNavigate();
  const { lectureCounts, loading } = useCourseData();
  const totalLectures = lectureCounts[courseId] || 0;
  const course = coursesData.find(c => c.courseId === courseId);
  
  if (!course || !progress) return null;
  
  // Calculate progress percentage dynamically
  const completedCount = progress.completedLectures?.length || 0;
  const progressPercentage = totalLectures > 0 
    ? Math.min(100, Math.round((completedCount / totalLectures) * 100)) 
    : 0;
  
  // Format the last accessed date
  const lastAccessedDate = progress.lastAccessed 
    ? new Date(progress.lastAccessed).toLocaleDateString() 
    : 'Never';
  
  const handleContinue = () => {
    navigate(`/courses/${courseId}/lectures/${progress.lectureId}`);
  };
  
  return (
    <Card variation="elevated" className="continue-learning-card">
      <Flex direction="column" gap="0.5rem">
        <Heading level={3}>{course.title}</Heading>
        <Text>Continue where you left off</Text>
        
        {/* Custom Progress Bar */}
        <View className="progress-container">
          <View 
            className="progress-bar"
            backgroundColor="var(--amplify-colors-background-secondary)"
            height="0.5rem"
            borderRadius="4px"
          >
            <View
              backgroundColor="var(--amplify-colors-brand-primary)"
              height="100%"
              borderRadius="4px"
              width={`${progressPercentage}%`}
            />
          </View>
        </View>
        
        <Text fontSize="0.8rem">
          {loading 
            ? 'Calculating progress...' 
            : `${completedCount} lectures completed`}
        </Text>
        
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontSize="0.8rem" color="grey">Last accessed: {lastAccessedDate}</Text>
          <Button onClick={handleContinue} variation="primary">
            Continue
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};

export default ContinueLearningCard;