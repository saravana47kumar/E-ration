import { useState, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { customerLinks } from './links';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiCamera, FiUpload, FiX, FiUser } from 'react-icons/fi';

export default function CustomerProfile() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    rationCardNumber: user?.rationCardNumber || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profileImage || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // ── pick file → show preview ──────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG or WEBP images allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ── upload to Cloudinary via backend ──────────────────
  const handleImageUpload = async () => {
    if (!imageFile) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('profileImage', imageFile);
      const { data } = await API.post('/auth/profile/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ ...user, profileImage: data.imageUrl });
      setImageFile(null);           // clear pending file
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePreview = () => {
    setImageFile(null);
    setImagePreview(user?.profileImage || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── save text profile ──────────────────────────────────
  const handleProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.put('/auth/profile', form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // ── change password ───────────────────────────────────
  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await API.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="max-w-lg space-y-6">

          {/* ── Profile Photo Card ── */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-5">Profile Photo</h2>

            <div className="flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover border-4 border-primary-100 shadow"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary-100 flex items-center justify-center border-4 border-primary-200 shadow">
                    <FiUser className="text-4xl text-primary-400" />
                  </div>
                )}

                {/* Camera overlay button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  title="Change photo"
                >
                  <FiCamera className="text-sm" />
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* If a new file is selected, show upload / cancel buttons */}
              {imageFile ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 truncate">
                    📎 {imageFile.name}
                  </div>
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploadingImage}
                    className="btn-primary flex items-center gap-2 py-2 px-4 text-sm whitespace-nowrap"
                  >
                    {uploadingImage ? (
                      <>
                        <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full inline-block" />
                        Uploading...
                      </>
                    ) : (
                      <><FiUpload className="text-sm" /> Upload</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePreview}
                    className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <FiX />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <FiCamera /> {imagePreview ? 'Change Photo' : 'Upload Photo'}
                </button>
              )}

              <p className="text-xs text-gray-400 text-center">
                JPG, PNG or WEBP · Max 5 MB · Recommended 400×400 px
              </p>
            </div>
          </div>

          {/* ── Account Info ── */}
          <div className="card bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-100">
            <div className="flex items-center gap-4">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="avatar" className="w-14 h-14 rounded-full object-cover border-2 border-primary-200" />
              ) : (
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary-600">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900 text-lg">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* ── Edit Profile ── */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Edit Profile</h2>
            <form onSubmit={handleProfile} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="label">Ration Card Number</label>
                <input
                  className="input"
                  value={form.rationCardNumber}
                  onChange={e => setForm({ ...form, rationCardNumber: e.target.value })}
                  placeholder="e.g. RC-2024-XXXXXX"
                />
              </div>
              <div>
                <label className="label">Delivery Address</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Door No, Street, City, Pincode"
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* ── Change Password ── */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Change Password</h2>
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={pwForm.confirm}
                  onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                  required
                  placeholder="Re-enter new password"
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
