import React, { useState, useRef } from 'react';
import {
  Card,
  Flex,
  Button,
  Text,
  Heading,
  TextAreaField,
  Radio,
  RadioGroupField,
  Alert,
  Loader,
  Badge,
  Accordion,  // Use Accordion instead of Expander
  Divider
} from '@aws-amplify/ui-react';
import TableDetector, { DetectionResult } from '../../../services/TableDetector';
import JsonUploadService, { UploadResult } from '../../../services/JsonUploadService';
import './JsonUploader.css';

const JsonUploader: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [tableDetectionResults, setTableDetectionResults] = useState<DetectionResult[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{ isValid: boolean, missingFields: string[] } | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'analyze' | 'validate' | 'upload-result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    setJsonFile(null);
    resetState();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setJsonFile(file);
    setJsonText('');
    resetState();
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setJsonText(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const resetState = () => {
    setParsedJson(null);
    setTableDetectionResults([]);
    setSelectedTable('');
    setValidationResult(null);
    setUploadResult(null);
    setError(null);
    setStep('upload');
  };

  const handleAnalyze = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Parse JSON
      const json = JSON.parse(jsonText);
      setParsedJson(json);
      
      // Detect table
      const results = TableDetector.detectTable(json);
      setTableDetectionResults(results);
      
      // Select the highest confidence table by default
      if (results.length > 0) {
        setSelectedTable(results[0].suggestedTable);
        
        // Validate against the selected table
        const validation = TableDetector.validateForTable(json, results[0].suggestedTable);
        setValidationResult(validation);
      }
      
      setStep('analyze');
    } catch (err: any) {
      console.error('Error analyzing JSON:', err);
      setError(`Invalid JSON format: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    
    if (parsedJson) {
      const validation = TableDetector.validateForTable(parsedJson, tableName);
      setValidationResult(validation);
    }
  };

  const handleUpload = async () => {
    if (!selectedTable || !parsedJson) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await JsonUploadService.uploadToTable(selectedTable, parsedJson);
      setUploadResult(result);
      setStep('upload-result');
    } catch (err: any) {
      console.error('Error uploading data:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setJsonText('');
    setJsonFile(null);
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadStep = () => (
    <Card variation="elevated">
      <Heading level={3}>1. Upload JSON Data</Heading>
      <Text>Provide the JSON data you want to upload to DynamoDB</Text>
      
      <Flex direction="row" gap="1rem" marginTop="1rem">
        <Button
          variation={!jsonFile ? "primary" : undefined}
          onClick={() => fileInputRef.current?.click()}
        >
          {jsonFile ? 'Change File' : 'Select JSON File'}
        </Button>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {jsonFile && (
          <Text>Selected: {jsonFile.name}</Text>
        )}
      </Flex>
      
      <Text marginTop="1rem" marginBottom="0.5rem">Or paste JSON content:</Text>
      <TextAreaField
        label=""
        value={jsonText}
        onChange={handleJsonTextChange}
        rows={10}
        placeholder='{
  "courseID": "course-123",
  "title": "Introduction to AWS",
  "description": "Learn the basics of AWS"
}'
      />
      
      <Flex justifyContent="space-between" marginTop="1rem">
        <Button onClick={handleReset} variation="link">Reset</Button>
        <Button 
          onClick={handleAnalyze} 
          isDisabled={!jsonText.trim()} 
          variation="primary"
          isLoading={isLoading}
        >
          Analyze JSON
        </Button>
      </Flex>
      
      {error && (
        <Alert variation="error" marginTop="1rem">{error}</Alert>
      )}
    </Card>
  );

  const renderAnalyzeStep = () => {
    if (!tableDetectionResults.length) {
      return (
        <Alert variation="warning">
          No tables matched your data structure. Please check your JSON format.
        </Alert>
      );
    }
    
    return (
      <Card variation="elevated">
        <Heading level={3}>2. Table Detection Results</Heading>
        <Text>The system has analyzed your JSON data and suggested the following tables:</Text>
        
        <RadioGroupField
          legend="Select a table for your data:"
          name="tableSelection"
          value={selectedTable}
          onChange={(e) => handleTableSelect(e.target.value)}
          marginTop="1rem"
        >
          {tableDetectionResults.map((result) => (
            <Flex key={result.suggestedTable} direction="column" marginBottom="1rem"  className='align-base'>
              <Radio value={result.suggestedTable}>
                <Flex alignItems="center" gap="0.5rem">
                  <Text fontWeight={result === tableDetectionResults[0] ? 'bold' : 'normal'}>
                    {result.suggestedTable}
                  </Text>
                  
                  <Badge
                    backgroundColor={
                      result.confidence > 79 ? '#E6F4EA' : 
                      result.confidence > 50 ? '#FEF7E0' : '#FEEAE6'
                    }
                    color={
                      result.confidence > 79 ? '#137333' : 
                      result.confidence > 50 ? '#B06000' : '#B31412'
                    }
                    borderRadius="10px"
                    padding="0.2rem 0.6rem"
                  >
                    {result.confidence}% match
                  </Badge>
                </Flex>
              </Radio>
              
              <Text marginLeft="1.8rem" fontSize="0.9rem" color="grey">
                {result.reasoning}
              </Text>
              
              <Accordion marginLeft="1.8rem" marginTop="0.5rem">
                <Accordion.Item value="matched">
                  <Accordion.Trigger>Matched Fields</Accordion.Trigger>
                  <Accordion.Content>
                    <Flex direction="row" wrap="wrap" gap="0.5rem">
                      {result.matchedFields.map(field => (
                        <Badge key={field} variation="success">{field}</Badge>
                      ))}
                    </Flex>
                  </Accordion.Content>
                </Accordion.Item>
                
                {result.missingFields.length > 0 && (
                  <Accordion.Item value="missing">
                    <Accordion.Trigger>Missing Fields</Accordion.Trigger>
                    <Accordion.Content>
                      <Flex direction="row" wrap="wrap" gap="0.5rem">
                        {result.missingFields.map(field => (
                          <Badge key={field} variation="error">{field}</Badge>
                        ))}
                      </Flex>
                    </Accordion.Content>
                  </Accordion.Item>
                )}
              </Accordion>
            </Flex>
          ))}
        </RadioGroupField>
        
        <Divider marginTop="1rem" marginBottom="1rem" />
        
        {validationResult && (
          <>
            <Heading className='padding-bottom' level={4}>Validation Result</Heading>
            {validationResult.isValid ? (
              <Alert variation="success">
                Your data is valid for the {selectedTable} table.
              </Alert>
            ) : (
              <Alert variation="warning">
                <Text>Your data is missing required fields for the {selectedTable} table:</Text>
                <Flex direction="row" wrap="wrap" gap="0.5rem" marginTop="0.5rem">
                  {validationResult.missingFields.map(field => (
                    <Badge key={field} variation="error">{field}</Badge>
                  ))}
                </Flex>
              </Alert>
            )}
          </>
        )}
        
        <Flex justifyContent="space-between" marginTop="1.5rem">
          <Button onClick={() => setStep('upload')} variation="link">Back</Button>
          <Button 
            onClick={handleUpload} 
            isDisabled={!selectedTable || (validationResult !== null && !validationResult.isValid)}
            variation="primary"
            isLoading={isLoading}
          >
            Upload to {selectedTable}
          </Button>
        </Flex>
      </Card>
    );
  };

  const renderUploadResult = () => {
    if (!uploadResult) return null;
    
    return (
      <Card variation="elevated">
        <Heading level={3}>3. Upload Results</Heading>
        
        {uploadResult.success ? (
          <Alert variation="success" marginTop="1rem">
            {uploadResult.message}
          </Alert>
        ) : (
          <Alert variation="error" marginTop="1rem">
            {uploadResult.message}
          </Alert>
        )}
        
        {uploadResult.records && (
          <Accordion marginTop="1rem">
            <Accordion.Item value="details">
              <Accordion.Trigger>View Upload Details</Accordion.Trigger>
              <Accordion.Content>
                <pre className="json-preview">
                  {JSON.stringify(uploadResult.records, null, 2)}
                </pre>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        )}
        
        {uploadResult.errors && uploadResult.errors.length > 0 && (
          <Accordion marginTop="1rem">
            <Accordion.Item value="errors">
              <Accordion.Trigger>View Errors</Accordion.Trigger>
              <Accordion.Content>
                <pre className="json-preview">
                  {JSON.stringify(uploadResult.errors, null, 2)}
                </pre>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        )}
        
        <Button 
          onClick={handleReset}
          variation="primary"
          marginTop="1.5rem"
          isFullWidth
        >
          Upload Another JSON
        </Button>
      </Card>
    );
  };

  const renderCurrentStep = () => {
    if (isLoading) {
      return (
        <Flex direction="column" alignItems="center" marginTop="3rem" marginBottom="3rem">
          <Loader size="large" />
          <Text marginTop="1rem">Processing...</Text>
        </Flex>
      );
    }
    
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'analyze':
        return renderAnalyzeStep();
      case 'upload-result':
        return renderUploadResult();
      default:
        return renderUploadStep();
    }
  };

  return (
    <div className="json-uploader-container">
      <Heading level={2} marginBottom="1.5rem">JSON Upload System</Heading>
      {renderCurrentStep()}
    </div>
  );
};

export default JsonUploader;