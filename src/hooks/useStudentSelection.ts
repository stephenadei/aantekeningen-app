import { useState } from 'react';
import type { MainPageStudent, MainPageStudentOverview, FileInfo } from '@/lib/interfaces';

export function useStudentSelection() {
  const [selectedStudent, setSelectedStudent] = useState<MainPageStudent | null>(null);
  const [studentOverview, setStudentOverview] = useState<MainPageStudentOverview | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentSelect = async (student: MainPageStudent) => {
    console.log('🔄 Loading student:', student.displayName, 'ID:', student.id);
    setSelectedStudent(student);
    setLoading(true);
    setCacheLoading(false);
    setError(null);
    setFiles([]); // Clear previous files

    try {
      console.log('📊 Fetching overview for student:', student.id);
      // Get overview first
      const apiUrl = `/api/students/overview/${student.id}`;
      const overviewResponse = await fetch(apiUrl);
      const overviewData = await overviewResponse.json();

      if (overviewData.success) {
        console.log('✅ Overview loaded:', overviewData.overview);
        setStudentOverview(overviewData.overview);
      } else {
        console.log('❌ Overview failed:', overviewData);
        // Set a default overview so hero section still shows
        setStudentOverview({
          fileCount: 0,
          lastActivity: null,
          lastActivityDate: 'Onbekend',
          lastFile: undefined
        });
      }
      
      // Hide main loading and show hero section immediately after overview attempt
      setLoading(false);

      // Show cache loading for files while hero is already visible
      setCacheLoading(true);
      
      console.log('📁 Fetching files for student:', student.id);
      // Get files (this is where AI analysis happens)
      const filesApiUrl = `/api/students/files/${student.id}`;
      const filesResponse = await fetch(filesApiUrl);
      const filesData = await filesResponse.json();

      console.log('📁 Files response:', filesData);

      if (filesData.success) {
        console.log('✅ Files loaded:', filesData.files?.length || 0, 'files');
        setFiles(filesData.files || []);
        
        // Check if files need more processing
        if (filesData.files && filesData.files.length > 0) {
          const hasUncachedFiles = filesData.files.some((file: FileInfo) => 
            !file.subject || !file.topic || !file.keywords || !file.summary
          );
          
          if (hasUncachedFiles) {
            console.log('⏳ Files need processing, showing cache loading...');
            // Keep showing cache loading for a bit longer
            setTimeout(() => setCacheLoading(false), 2000);
          } else {
            console.log('✅ All files processed, hiding cache loading');
            // Hide cache loading immediately if all files are processed
            setCacheLoading(false);
          }
        } else {
          // Check if student has notes indicator
          if (student && !student.hasNotes) {
            console.log('ℹ️ Student has no notes (expected)');
            setError(null); // Don't show error if student has no notes (they might only have appointments)
            setCacheLoading(false);
          } else {
            console.log('❌ Student has no files - this should not happen if student was found');
            setError('Er zijn geen aantekeningen gevonden voor deze student. Dit kan een tijdelijk probleem zijn.');
            setCacheLoading(false);
          }
        }
      } else {
        console.log('❌ Files loading failed:', filesData);
        // More specific error handling for files
        if (filesData.error === 'Configuration error') {
          setError('De app is momenteel niet beschikbaar. Probeer het later opnieuw.');
        } else if (filesData.isTemporaryError) {
          setError('Er is een tijdelijk probleem met Google Drive. Probeer het over een paar minuten opnieuw.');
        } else if (filesData.message) {
          setError(filesData.message);
        } else {
          setError('Er is een fout opgetreden bij het laden van bestanden. Probeer het opnieuw.');
        }
        setCacheLoading(false);
      }
    } catch (err) {
      console.error('❌ Student select error:', err);
      const errorMessage = err instanceof Error 
        ? `Er is een fout opgetreden: ${err.message}` 
        : 'Er is een fout opgetreden bij het laden van studentgegevens';
      setError(errorMessage);
      setLoading(false);
      setCacheLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setSelectedStudent(null);
    setStudentOverview(null);
    setFiles([]);
    setError(null);
    setCacheLoading(false);
  };

  return {
    selectedStudent,
    studentOverview,
    files,
    loading,
    cacheLoading,
    error,
    handleStudentSelect,
    handleBackToSearch,
    setFiles,
  };
}

