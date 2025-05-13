import { supabase } from '../lib/supabase';// Adjust import path as needed

/**
 * Uploads a file to Supabase storage in the candidate-assets bucket
 * Files are organized by candidate name
 * 
 * @param {File} file - The file to upload
 * @param {string} candidateName - The candidate's name for organizing files
 * @param {number} questionId - The question ID associated with this file upload
 * @returns {Promise<{filePath: string, fileUrl: string}>} - The file path and public URL
 */
export const uploadCandidateFile = async (file, candidateName, questionId) => {
  if (!file || !candidateName) {
    throw new Error('File and candidate name are required');
  }

  // Format the candidate name for folder structure (replace spaces with underscores)
  const folderName = candidateName.replace(/\s+/g, '_');
  
  // Create a timestamp prefix to ensure unique filenames
  const timestamp = Date.now();
  
  // Get file extension from the original filename
  const fileExtension = file.name.split('.').pop();
  
  // Create the file path using the specified folder structure
  // candidate-assets/candidate-files/John_Doe/1713459000-resume.pdf
  const filePath = `candidate-files/${folderName}/${timestamp}-q${questionId}.${fileExtension}`;
  
  try {
    // Upload the file to Supabase storage
    const { data, error } = await supabase
      .storage
      .from('candidate-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      throw new Error(`Error uploading file: ${error.message}`);
    }
    
    // Get the public URL for the uploaded file
    const fileUrl = supabase
      .storage
      .from('candidate-assets')
      .getPublicUrl(filePath).data.publicUrl;
      
    return {
      filePath,
      fileUrl
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

/**
 * Processes multiple file uploads for a candidate's assessment submission
 * 
 * @param {Record<number, string | number | File>} answers - The answers object containing file uploads
 * @param {string} candidateName - The candidate's name
 * @returns {Promise<Record<number, string | number | {filePath: string, fileUrl: string}>>} - Processed answers with file paths
 */
export const processFileUploads = async (answers, candidateName) => {
  const processedAnswers = { ...answers };
  
  // Process each answer to check for files that need uploading
  for (const [questionId, answer] of Object.entries(answers)) {
    // If the answer is a File object, upload it to Supabase
    if (answer instanceof File) {
      const uploadResult = await uploadCandidateFile(
        answer, 
        candidateName,
        questionId
      );
      
      // Replace the File object with the upload result information
      processedAnswers[questionId] = {
        originalFilename: answer.name,
        filePath: uploadResult.filePath,
        fileUrl: uploadResult.fileUrl,
        fileSize: answer.size,
        fileType: answer.type
      };
    }
  }
  
  return processedAnswers;
};
