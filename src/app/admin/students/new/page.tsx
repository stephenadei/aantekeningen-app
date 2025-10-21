'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, EyeOff, Check, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import type { CreateStudentInput } from '@/lib/interfaces';
import { createStudentName, createEmail, createDriveFolderId, createSubject, createPin } from '@/lib/types';

interface FormData {
  displayName: string;
  email: string;
  pin: string;
  confirmPin: string;
  driveFolderId: string;
  subject: string;
  tags: string;
}

interface FormErrors {
  displayName?: string;
  email?: string;
  pin?: string;
  confirmPin?: string;
  driveFolderId?: string;
  subject?: string;
  general?: string;
}

export default function CreateStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    email: '',
    pin: '',
    confirmPin: '',
    driveFolderId: '',
    subject: '',
    tags: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const subjectOptions = [
    { value: '', label: 'Select a subject' },
    { value: 'wiskunde-a', label: 'Wiskunde A' },
    { value: 'wiskunde-b', label: 'Wiskunde B' },
    { value: 'natuurkunde', label: 'Natuurkunde' },
    { value: 'scheikunde', label: 'Scheikunde' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'nederlands', label: 'Nederlands' },
    { value: 'engels', label: 'Engels' }
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (!formData.pin) {
      newErrors.pin = 'PIN is required';
    } else if (!/^\d{6}$/.test(formData.pin)) {
      newErrors.pin = 'PIN must be exactly 6 digits';
    }

    if (!formData.confirmPin) {
      newErrors.confirmPin = 'Please confirm the PIN';
    } else if (formData.pin !== formData.confirmPin) {
      newErrors.confirmPin = 'PINs do not match';
    }

    // Optional fields with validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.driveFolderId && formData.driveFolderId.length < 20) {
      newErrors.driveFolderId = 'Drive folder ID must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPinStrength = (pin: string): { strength: 'weak' | 'medium' | 'strong'; message: string } => {
    if (pin.length < 4) return { strength: 'weak', message: 'Too short' };
    if (pin.length < 6) return { strength: 'medium', message: 'Getting better' };
    
    // Check for patterns
    if (/^(\d)\1+$/.test(pin)) return { strength: 'weak', message: 'Avoid repeated digits' };
    if (/123456|654321|000000|111111/.test(pin)) return { strength: 'weak', message: 'Avoid common patterns' };
    
    return { strength: 'strong', message: 'Strong PIN' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const payload: CreateStudentInput = {
        displayName: createStudentName(formData.displayName.trim()),
        pin: createPin(formData.pin),
        ...(formData.email && { email: createEmail(formData.email.trim()) }),
        ...(formData.driveFolderId && { driveFolderId: createDriveFolderId(formData.driveFolderId.trim()) }),
        ...(formData.subject && { subject: createSubject(formData.subject) })
      };

      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create student');
      }

      const result = await response.json();
      
      // Success - redirect to student detail page
      router.push(`/admin/students/${result.student.id}`);
    } catch (error) {
      console.error('Error creating student:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create student'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const pinStrength = getPinStrength(formData.pin);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Student</h1>
          <p className="text-gray-600 mt-1">
            Add a new student to the system
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <X className="w-4 h-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{errors.general}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Input
                  label="Display Name *"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter student's display name"
                  error={errors.displayName}
                  required
                />
              </div>

              <div>
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="student@example.com"
                  error={errors.email}
                />
              </div>

              <div>
                <Select
                  label="Subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  options={subjectOptions}
                  error={errors.subject}
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="relative">
                  <Input
                    label="PIN *"
                    type={showPin ? 'text' : 'password'}
                    value={formData.pin}
                    onChange={(e) => handleInputChange('pin', e.target.value)}
                    placeholder="6-digit PIN"
                    error={errors.pin}
                    required
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {formData.pin && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        pinStrength.strength === 'weak' ? 'bg-red-500' :
                        pinStrength.strength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span className={`text-xs ${
                        pinStrength.strength === 'weak' ? 'text-red-600' :
                        pinStrength.strength === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {pinStrength.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="relative">
                  <Input
                    label="Confirm PIN *"
                    type={showConfirmPin ? 'text' : 'password'}
                    value={formData.confirmPin}
                    onChange={(e) => handleInputChange('confirmPin', e.target.value)}
                    placeholder="Confirm 6-digit PIN"
                    error={errors.confirmPin}
                    required
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {formData.confirmPin && formData.pin === formData.confirmPin && (
                  <div className="mt-2 flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-xs">PINs match</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drive Integration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Drive Integration</h3>
            
            <div>
              <Input
                label="Drive Folder ID"
                value={formData.driveFolderId}
                onChange={(e) => handleInputChange('driveFolderId', e.target.value)}
                placeholder="Google Drive folder ID (optional)"
                error={errors.driveFolderId}
                helperText="Link this student to a specific Google Drive folder"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            
            <div>
              <Textarea
                label="Tags"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="Enter tags separated by commas (e.g., advanced, struggling, needs-help)"
                rows={3}
                helperText="Tags help categorize and organize students"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Student
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
