# AI-Powered Study Content Generator and Quiz Platform

An advanced educational platform that transforms lecture materials into summarized content and interactive quizzes using AI. Built with React, TypeScript, and AWS Amplify Gen 2.

![Education Platform](https://img.shields.io/badge/Education-Platform-purple)
![AWS Amplify](https://img.shields.io/badge/AWS-Amplify-darkred)
![React](https://img.shields.io/badge/React-TypeScript-blue)
![AI](https://img.shields.io/badge/AI-Powered-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-Serverless-green)

## Overview

This platform automatically processes educational content from documents (PDFs, PowerPoints), generates concise summaries, identifies key concepts, and creates assessment quizzes - all using AI. It features an administrative review process, secure authentication, and an intuitive user interface for both educators and students.

## Core Features

- **Intelligent Document Processing**: Extract text and context from PDF and PowerPoint files
- **AI-Powered Summarization**: Generate concise, educational summaries from lecture materials
- **Automated Quiz Generation**: Create multiple-choice questions with answers and explanations
- **Administrative Workflow**: Review, approve, and manage educational content
- **Responsive Interface**: Access content across desktop and mobile devices
- **Secure Authentication**: Role-based access for students and administrators

## Technology Stack

- **Frontend**: React, TypeScript, Vite, AWS Amplify UI Components
- **Backend**: AWS Amplify Gen 2, AWS Lambda, DynamoDB
- **AI/ML**: Google Gemini AI for content summarization and quiz generation
- **Infrastructure**: Serverless architecture with AWS services
- **Authentication**: AWS Cognito with role-based permissions
- **File Storage**: Amazon S3 with secure access controls

## Getting Started

### Prerequisites

1. **Node.js and npm**: Install Node.js (v18 or newer) from [nodejs.org](https://nodejs.org/)
2. **AWS Account**: Create a free AWS account at [aws.amazon.com](https://aws.amazon.com/)
3. **Google API Key**: Obtain a Google Gemini API key from [Google AI Studio](https://ai.google.dev/)
4. **Git**: Install Git from [git-scm.com](https://git-scm.com/)

### Step 1: Clone the Repository

```bash
git clone <https://github.com/PeretzNiro/study-summarization-quiz.git>
cd study-summarization-quiz

```

### Step 2: Install Dependencies

```bash
npm install

```

### Step 3: Install and Configure AWS Amplify CLI

```bash
npm install -g @aws-amplify/cli

```

### Step 4: Initialize Amplify Project

```bash
amplify init

```

During initialization:

- Choose a name for your environment (e.g., `dev`)
- Select your preferred editor
- Choose "AWS access keys" for authentication
- Enter your AWS access key and secret key
- Select your region

### Step 5: Configure Secrets for Google Gemini API

1. Create a secrets file in your AWS account:

```bash
aws secretsmanager create-secret --name Gemini-API-Key --secret-string "{\\"GEMINI_API_KEY\\":\\"your-gemini-api-key\\"}"

```

1. Update the `backend.ts` file to ensure Lambda functions can access the secret:

```bash
amplify update function

```

Select `summarization` and `quizGenerator` functions and add permissions to access the secret.

### Step 6: Deploy the Backend

```bash
amplify push

```

This will create all necessary AWS resources (DynamoDB tables, Lambda functions, S3 buckets, etc.)

### Step 7: Create an Admin User

1. Navigate to the AWS Cognito console
2. Find your user pool (created by Amplify)
3. Add a new user with admin privileges:
    - Username/email: your preferred email
    - Add to group: `Admins`

### Step 8: Start the Development Server

```bash
npm run dev

```

The application should now be running on `http://localhost:5173/`

### Step 9: Testing the Application

1. **Login** with the admin user credentials
2. **Upload a Document**:
    - Click "Upload" in the navigation
    - Choose a PDF or PowerPoint lecture
    - Wait for processing to complete
3. **Review Document**:
    - Go to Admin panel
    - Check the "Pending Uploads" tab
    - Review and approve the document
4. **View Summarized Content**:
    - After approval, the document will be processed
    - View the summary in the "Lectures" section
5. **Take a Quiz**:
    - After processing, quizzes will be available
    - Test the quiz functionality

## Common Issues and Fixes

1. **PDF Processing Errors**:
    - Ensure the PDF isn't encrypted or password-protected
2. **API Limit Errors**:
    - If you hit Gemini API rate limits, wait a few minutes before trying again
3. **Permission Errors**:
    - Make sure your AWS account has permissions to create all the required resources
    - Check if the Lambda functions have the correct IAM roles to access the Secrets Manager
4. **Library Issues**:
    - If the PDF parser fails, the fix-pdf-parse.cjs script might need to be run:
        
        ```bash
        node fix-pdf-parse.cjs
        
        ```
        

## Cleaning Up

When you're done testing, you can remove all AWS resources:

```bash
amplify delete

```

This will delete all cloud resources associated with the project.

## Usage Workflow
1. Admin uploads educational materials (PDF or PowerPoint)
2. System processes documents and places them in review queue
3. Admin reviews and approves the processed content
4. AI generates summaries and quizzes from approved content
5. Students access the materials and complete quizzes
6. Progress tracking monitors student engagement and performance

## Contributing
Contributions are welcome! Please read our Contributing Guidelines for details on our code of conduct and the process for submitting pull requests.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the [MIT License](LICENSE).