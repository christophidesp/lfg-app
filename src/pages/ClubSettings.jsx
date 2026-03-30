import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

export default function ClubSettings() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', workout_creation: 'admins' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchClubData();
  }, [id]);

  const fetchClubData = async () => {
    setLoading(true);

    const { data: clubData } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', id)
      .single();

    if (!clubData) {
      navigate('/clubs');
      return;
    }

    setClub(clubData);
    setFormData({
      name: clubData.name,
      description: clubData.description || '',
      workout_creation: clubData.workout_creation || 'admins',
    });
    setAvatarPreview(clubData.avatar_url);

    const { data: membersData } = await supabase
      .from('club_members')
      .select(`
        *,
        profiles:user_id (id, full_name, avatar_url)
      `)
      .eq('club_id', id)
      .eq('status', 'approved');

    if (membersData) {
      setMembers(membersData);
      const me = membersData.find(m => m.user_id === user.id);
      if (!me || !['owner', 'admin'].includes(me.role)) {
        navigate(`/clubs/${id}`);
        return;
      }
      setUserRole(me.role);
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let avatar_url = club.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const filePath = `${id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('club-avatars')
          .upload(filePath, avatarFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('club-avatars')
          .getPublicUrl(filePath);
        avatar_url = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('clubs')
        .update({
          name: formData.name,
          description: formData.description || null,
          avatar_url,
          workout_creation: formData.workout_creation,
        })
        .eq('id', id);

      if (updateError) throw updateError;
      setSuccess('Club updated.');
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleRoleChange = async (memberId, newRole) => {
    const { error } = await supabase
      .from('club_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (!error) fetchClubData();
  };

  const handleRemoveMember = async (memberId) => {
    const { error } = await supabase
      .from('club_members')
      .update({ status: 'rejected' })
      .eq('id', memberId);

    if (!error) fetchClubData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[13px] text-fg-secondary">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-2xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-sans text-[26px] font-normal tracking-[-0.01em]">Club Settings</h1>
          <Link
            to={`/clubs/${id}`}
            className="btn-secondary text-[11px] px-3 py-1.5"
          >
            Back to Club
          </Link>
        </div>

        {/* Edit Club Info */}
        <form onSubmit={handleSave} className="border border-border bg-surface p-6 mb-6">
          <h2 className="section-label">Club Info</h2>

          {error && (
            <div className="border border-[#EF4444] text-[#EF4444] font-mono text-[12px] px-4 py-3 mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="border border-[#166534] text-[#4ADE80] font-mono text-[12px] px-4 py-3 mb-6">
              {success}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="form-label">Club Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="form-label">Club Avatar</label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-16 h-16 object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 bg-surface-secondary border border-border flex items-center justify-center">
                    <span className="font-mono text-[18px] text-fg-muted">?</span>
                  </div>
                )}
                <label className="btn-secondary text-[11px] px-4 py-1.5 cursor-pointer">
                  Upload
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="form-label">Who can create workouts?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="workout_creation"
                    value="admins"
                    checked={formData.workout_creation === 'admins'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-border-strong peer-checked:border-accent peer-checked:bg-accent flex items-center justify-center">
                    {formData.workout_creation === 'admins' && <div className="w-1.5 h-1.5 bg-[#0A0A0A]" />}
                  </div>
                  <span className="font-mono text-[12px] text-fg-secondary">Admins only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="workout_creation"
                    value="everyone"
                    checked={formData.workout_creation === 'everyone'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-border-strong peer-checked:border-accent peer-checked:bg-accent flex items-center justify-center">
                    {formData.workout_creation === 'everyone' && <div className="w-1.5 h-1.5 bg-[#0A0A0A]" />}
                  </div>
                  <span className="font-mono text-[12px] text-fg-secondary">Everyone</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button type="submit" disabled={saving} className="btn-accent disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Manage Members */}
        <div className="border border-border bg-surface p-6">
          <h2 className="section-label">Members ({members.length})</h2>
          <div className="space-y-0">
            {members.map((member, i) => (
              <div
                key={member.id}
                className={`flex items-center justify-between py-3 ${i < members.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    name={member.profiles?.full_name}
                    avatarUrl={member.profiles?.avatar_url}
                    userId={member.user_id}
                    size="sm"
                    linked
                  />
                  <span className="font-mono text-[13px]">{member.profiles?.full_name || 'Runner'}</span>
                  <span className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-[2px] border ${
                    member.role === 'owner'
                      ? 'bg-accent text-[#0A0A0A] border-accent'
                      : member.role === 'admin'
                      ? 'bg-surface-secondary text-fg-secondary border-border'
                      : 'text-fg-muted border-border'
                  }`}>
                    {member.role}
                  </span>
                </div>
                {member.role !== 'owner' && member.user_id !== user.id && (
                  <div className="flex gap-2">
                    {member.role === 'member' ? (
                      <button
                        onClick={() => handleRoleChange(member.id, 'admin')}
                        className="btn-ghost text-[10px] px-2.5 py-1"
                      >
                        Promote
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(member.id, 'member')}
                        className="btn-ghost text-[10px] px-2.5 py-1"
                      >
                        Demote
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="btn-decline text-[10px] px-2.5 py-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
