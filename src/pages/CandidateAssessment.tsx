import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertCircle, Camera, Mic, User, CheckCircle } from 'lucide-react';
import AssessmentInterface from '../components/AssessmentInterface';
import { useFullScreen } from '../hooks/useFullScreen';
import { useTabFocus } from '../hooks/useTabFocus';
import { useTimer } from '../hooks/useTimer';
import { useTestStore } from '../store/testStore';

function CandidateAssessment() {
  const [isAssessmentStarted, setIsAssessmentStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const { isFullScreen, toggleFullScreen } = useFullScreen();
  const { tabSwitchCount, resetTabCount, startTracking, stopTracking } = useTabFocus();
  const { activeTest } = useTestStore();
  const { timeRemaining, isTimeUp, startTimer, stopTimer, timeTaken, formattedTimeTaken } = useTimer((activeTest?.duration ?? 45) * 60);

  const requestPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video tracks available in the media stream');
      }
      
      setStream(mediaStream);
      setHasPermissions(true);
      setPermissionError(null);
      
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionError(`Camera and microphone access error: ${error.message || 'Please check your browser settings'}`);
    }
  };

  useEffect(() => {
    if (stream && hasPermissions && previewVideoRef.current) {
      previewVideoRef.current.srcObject = stream;
      
      previewVideoRef.current.onloadedmetadata = () => {
        previewVideoRef.current?.play().catch(playError => {
          console.error('Error playing video:', playError);
          setPermissionError('Error displaying camera feed. Please try again.');
        });
      };
      
      previewVideoRef.current.onerror = (event) => {
        console.error('Video element error:', event);
        setPermissionError('Error with video display. Please refresh and try again.');
      };
    }
  }, [stream, hasPermissions]);

  useEffect(() => {
    if (stream && isAssessmentStarted) {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(playError => {
            console.error('Error playing video after start:', playError);
          });
        };
      }
    }
  }, [isAssessmentStarted, stream]);

  useEffect(() => {
    if (isSubmitted && stream) {
      stream.getTracks().forEach(track => track.stop());
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = null;
      }
    }
  }, [isSubmitted, stream]);

  useEffect(() => {
    if (isAssessmentStarted && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(playError => {
          console.error('Error playing video in assessment mode:', playError);
        });
      };
    }
  }, [isAssessmentStarted, stream]);

  const startAssessment = async () => {
    if (!activeTest) {
      alert('No active test available. Please contact the administrator.');
      return;
    }
    
    if (!candidateName.trim()) {
      setNameError('Please enter your name to continue');
      return;
    }
    
    if (!stream || stream.getVideoTracks().length === 0 || !stream.getVideoTracks()[0].enabled) {
      setPermissionError('Camera stream is not available. Please restart the permission process.');
      setHasPermissions(false);
      return;
    }
    
    // Removed the toggleFullScreen call here
    setIsAssessmentStarted(true);
    resetTabCount();
    startTracking();
    startTimer();
    
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(playError => {
          console.error('Error playing video in assessment mode:', playError);
        });
      };
    }
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCandidateName(e.target.value);
    if (nameError) setNameError(null);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    stopTracking();
    stopTimer();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!activeTest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Test</h2>
          <p className="text-gray-600">There is currently no active test available.</p>
          <p className="text-gray-600 mt-2">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (!isAssessmentStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="flex items-center justify-center space-x-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Candidate Assessment</h1>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{activeTest.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{activeTest.description}</p>
              <div className="mt-2 text-sm text-gray-600">
                <span>{activeTest.questions.length} questions</span>
                <span className="mx-2">•</span>
                <span>{activeTest.duration} minutes</span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700">
                Enter your name
              </label>
              <div className="flex items-center relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </span>
                <input
                  type="text"
                  id="candidateName"
                  placeholder="Full Name"
                  value={candidateName}
                  onChange={handleNameChange}
                  className="pl-10 w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              {nameError && <p className="text-sm text-red-600">{nameError}</p>}
            </div>

            <p className="text-gray-600">
              Before starting the assessment, please note:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <span className="mt-0.5">•</span>
                <span>Switching tabs or windows is not allowed</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="mt-0.5">•</span>
                <span>Copying or pasting content is disabled</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="mt-0.5">•</span>
                <span>Camera and microphone access is required</span>
              </li>
            </ul>
          </div>

          {!hasPermissions && (
            <div className="space-y-4">
              {permissionError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {permissionError}
                </div>
              )}
              <button
                onClick={requestPermissions}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-200 flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <Mic className="w-4 h-4" />
                <span>Allow Camera & Microphone Access</span>
              </button>
            </div>
          )}

          {hasPermissions && (
            <>
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={startAssessment}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-200"
              >
                Start Assessment
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Use AssessmentInterface for both active assessment and submission screen
  return (
    <div className="relative">
      {!isSubmitted && (
        <div className="fixed bottom-4 right-4 w-64 aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-lg border-2 border-indigo-100">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <AssessmentInterface 
        tabSwitchCount={tabSwitchCount} 
        timeRemaining={timeRemaining}
        isTimeUp={isTimeUp}
        onSubmit={handleSubmit}
        questions={activeTest.questions}
        candidateName={candidateName}
        isSubmitted={isSubmitted}
        timeTaken={formattedTimeTaken}
      />
    </div>
  );
}

export default CandidateAssessment;