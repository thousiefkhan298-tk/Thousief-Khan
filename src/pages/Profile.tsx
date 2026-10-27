import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { firebaseService } from '../services/firebaseService';
import { User, Phone, Mail, Award, Briefcase, FileText, Camera, Check, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';

const Profile: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [certifications, setCertifications] = useState('');
  const [experience, setExperience] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phoneNumber || '');
      setBio(user.bio || '');
      setSpecialties(user.specialties || '');
      setCertifications(user.certifications || '');
      setExperience(user.experience || '');
      setPhotoURL(user.photoURL || user.avatar || '');
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    try {
      setIsUploadingPhoto(true);
      setStatusMessage(null);
      const uploadedUrl = await firebaseService.uploadFile(file, `profiles/${user.uid}`);
      setPhotoURL(uploadedUrl);
      
      await firebaseService.updateUser(user.uid, {
        photoURL: uploadedUrl,
        avatar: uploadedUrl
      });
      
      setStatusMessage({ type: 'success', text: 'Profile photo updated successfully!' });
    } catch (err: any) {
      console.error("Error uploading profile photo:", err);
      setStatusMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    try {
      setIsSaving(true);
      setStatusMessage(null);

      const updateData: any = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        bio: bio.trim(),
        photoURL: photoURL,
        avatar: photoURL
      };

      if (user.role === 'TRAINER') {
        updateData.specialties = specialties.trim();
        updateData.certifications = certifications.trim();
        updateData.experience = experience.trim();
      }

      await firebaseService.updateUser(user.uid, updateData);
      setStatusMessage({ type: 'success', text: 'Trainer profile saved & published successfully!' });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setStatusMessage({ type: 'error', text: 'Failed to save profile changes. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isTrainer = user?.role === 'TRAINER';

  return (
    <Layout userData={user}>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div className="space-y-2">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(isTrainer ? '/dashboard?tab=dashboard' : '/dashboard?tab=profile');
                }
              }}
              aria-label="Go back"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors min-h-[44px] py-2 px-1 focus-visible:ring-2 focus-visible:ring-brand-red focus:outline-none rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 text-brand-red" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-brand-red/20 text-brand-red font-mono text-[10px] uppercase font-bold rounded-md tracking-wider">
                {user?.role || 'CLIENT'}
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified account
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display uppercase tracking-wider text-white">
              {isTrainer ? 'Trainer Profile & Credentials' : 'My Profile'}
            </h2>
          </div>
          
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-6 py-3 min-h-[44px] bg-brand-red hover:bg-neutral-100 text-white hover:text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(255,0,0,0.2)] disabled:opacity-50 self-start sm:self-auto flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
          >
            {isSaving ? (
              <span>Saving changes...</span>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save changes
              </>
            )}
          </button>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-2xl border text-xs font-mono flex items-center gap-3 transition-all ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[#141417] border border-[#262630] rounded-[2.5rem] p-8 shadow-xl space-y-8">
          {/* Header Photo & Primary Details */}
          <div className="flex flex-col sm:flex-row items-center gap-8 border-b border-neutral-800 pb-8">
            <div className="relative group shrink-0">
              <div className="w-28 h-28 rounded-3xl overflow-hidden bg-neutral-900 border-2 border-brand-red/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                {photoURL ? (
                  <img src={photoURL} alt={name || 'Profile'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-red/10 flex items-center justify-center font-display italic text-4xl text-brand-red">
                    {name?.[0]?.toUpperCase() || 'A'}
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2.5 bg-brand-red hover:bg-neutral-100 text-white hover:text-black rounded-xl cursor-pointer shadow-lg transition-all border border-neutral-900">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload} 
                  disabled={isUploadingPhoto} 
                />
              </label>
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/70 rounded-3xl flex items-center justify-center text-[10px] font-mono text-white">
                  Uploading...
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <h3 className="text-2xl font-bold uppercase tracking-wider text-white font-display">{name || user?.name || 'Speed Fit Member'}</h3>
                <span className="px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-mono uppercase font-bold rounded-full">
                  {user?.role || 'CLIENT'}
                </span>
              </div>
              <p className="font-mono text-xs text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-red" /> {user?.email}
              </p>
              <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest pt-1">
                Account ID: {user?.uid ? `${user.uid.substring(0, 12)}...` : 'N/A'} • Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Editable Form */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-red" /> Full Name
                </label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Coach Alex Rivera"
                  className="w-full p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl font-mono text-xs text-white placeholder-neutral-600 focus:border-brand-red outline-none transition-all"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-red" /> Direct Phone Number
                </label>
                <input 
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., +1 (555) 019-2834"
                  className="w-full p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl font-mono text-xs text-white placeholder-neutral-600 focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            {/* Trainer Specific Credentials */}
            {isTrainer && (
              <div className="space-y-6 pt-4 border-t border-neutral-800">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-brand-red flex items-center gap-2">
                  <Award className="w-4 h-4" /> Professional Coaching Credentials
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Specialties */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-red" /> Coaching Specialties & Focus Areas
                    </label>
                    <input 
                      type="text"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      placeholder="e.g., EMS Performance, Hypertrophy, Metabolic Conditioning"
                      className="w-full p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl font-mono text-xs text-white placeholder-neutral-600 focus:border-brand-red outline-none transition-all"
                    />
                  </div>

                  {/* Certifications */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-brand-red" /> Certifications & Accreditations
                    </label>
                    <input 
                      type="text"
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      placeholder="e.g., NASM CPT, EMS Master Trainer, Precision Nutrition"
                      className="w-full p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl font-mono text-xs text-white placeholder-neutral-600 focus:border-brand-red outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-brand-red" /> Years of Coaching Experience
                  </label>
                  <input 
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g., 8+ Years Clinical & EMS Training"
                    className="w-full p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl font-mono text-xs text-white placeholder-neutral-600 focus:border-brand-red outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Biography */}
            <div className="space-y-2 pt-4 border-t border-neutral-800">
              <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-red" /> Professional Biography & Training Vision
              </label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Share your background, training philosophy, or personal fitness journey with your clients..."
                className="w-full p-3.5 bg-[#0D0D0F] border border-neutral-800 rounded-2xl font-mono text-xs text-white placeholder-neutral-600 focus:border-brand-red outline-none transition-all resize-y"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-4 bg-brand-red hover:bg-neutral-100 text-white hover:text-black font-mono text-xs uppercase font-black tracking-widest rounded-2xl transition-all shadow-[0_0_25px_rgba(255,0,0,0.25)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Updating Profile...' : 'Save & Publish Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
