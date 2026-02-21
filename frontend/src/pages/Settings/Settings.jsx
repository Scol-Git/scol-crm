import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Globe, Palette, Users, Plus } from 'lucide-react';
import { Card, Button, Input, Select } from '../../components';
import { colors } from '../../theme';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profileData, setProfileData] = useState({
    fullName: 'Admin User',
    email: 'admin@scolcrm.com',
    phone: '+1234567800',
    timezone: 'UTC',
    language: 'en',
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'roles', label: 'Roles Management', icon: Users },
  ];

  const tabContainerStyle = {
    display: 'flex',
    gap: isMobile ? '4px' : '8px',
    marginBottom: '24px',
    borderBottom: `1px solid ${colors.borderLight}`,
    paddingBottom: '0',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
  };

  const getTabStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '4px' : '8px',
    padding: isMobile ? '10px 12px' : '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: isMobile ? '13px' : '14px',
    fontWeight: isActive ? '600' : '500',
    fontFamily: 'inherit',
    color: isActive ? colors.brandPrimary : colors.textSecondary,
    borderBottom: isActive ? `2px solid ${colors.brandPrimary}` : '2px solid transparent',
    marginBottom: '-1px',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'EST', label: 'Eastern Time (EST)' },
    { value: 'PST', label: 'Pacific Time (PST)' },
    { value: 'GMT', label: 'Greenwich Mean Time (GMT)' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
  ];

  const renderProfileSettings = () => (
    <Card title="Profile Information" subtitle="Update your personal information">
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', maxWidth: '600px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
            gap: '20px',
            marginBottom: '24px',
            paddingBottom: '24px',
            borderBottom: `1px solid ${colors.borderLight}`,
            textAlign: isMobile ? 'center' : 'left',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              backgroundColor: colors.brandPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '700',
              fontSize: '28px',
              flexShrink: 0,
            }}>
              A
            </div>
            <div>
              <Button variant="secondary" size="small">Change Photo</Button>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: colors.textSecondary }}>
                JPG, GIF or PNG. Max size 2MB.
              </p>
            </div>
          </div>
        </div>
        <Input
          label="Full Name"
          name="fullName"
          value={profileData.fullName}
          onChange={handleInputChange}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={profileData.email}
          onChange={handleInputChange}
        />
        <Input
          label="Phone"
          name="phone"
          value={profileData.phone}
          onChange={handleInputChange}
        />
        <Select
          label="Timezone"
          name="timezone"
          value={profileData.timezone}
          onChange={handleInputChange}
          options={timezoneOptions}
        />
        <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
          <Button>Save Changes</Button>
        </div>
      </div>
    </Card>
  );

  const renderNotificationSettings = () => (
    <Card title="Notification Preferences" subtitle="Manage how you receive notifications">
      <div style={{ maxWidth: '600px' }}>
        {[
          { id: 'email_leads', label: 'New Lead Notifications', description: 'Get notified when a new lead is added' },
          { id: 'email_apps', label: 'Application Updates', description: 'Get notified about application status changes' },
          { id: 'email_weekly', label: 'Weekly Summary', description: 'Receive a weekly summary of activities' },
          { id: 'push_urgent', label: 'Urgent Alerts', description: 'Push notifications for urgent matters' },
        ].map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: `1px solid ${colors.borderLight}`,
            }}
          >
            <div>
              <div style={{ fontWeight: '500', color: colors.textPrimary, marginBottom: '4px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                {item.description}
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.success,
                borderRadius: '24px',
                transition: '0.4s',
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '18px',
                  width: '18px',
                  left: '26px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.4s',
                }} />
              </span>
            </label>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card title="Security Settings" subtitle="Manage your account security">
      <div style={{ maxWidth: '600px' }}>
        <div style={{
          padding: '20px',
          backgroundColor: colors.appBg,
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: colors.textPrimary }}>Change Password</h4>
          <Input
            label="Current Password"
            name="currentPassword"
            type="password"
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            name="newPassword"
            type="password"
            placeholder="Enter new password"
          />
          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm new password"
          />
          <Button style={{ marginTop: '8px' }}>Update Password</Button>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: colors.appBg,
          borderRadius: '8px',
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>Two-Factor Authentication</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: '0 0 16px 0' }}>
            Add an extra layer of security to your account.
          </p>
          <Button variant="secondary">Enable 2FA</Button>
        </div>
      </div>
    </Card>
  );

  const renderPreferencesSettings = () => (
    <Card title="Application Preferences" subtitle="Customize your experience">
      <div style={{ maxWidth: '600px' }}>
        <Select
          label="Language"
          name="language"
          value={profileData.language}
          onChange={handleInputChange}
          options={languageOptions}
        />
        <div style={{ marginTop: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500', color: colors.textPrimary }}>
            Theme
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Light', 'Dark', 'System'].map((theme) => (
              <button
                key={theme}
                style={{
                  padding: '12px 24px',
                  border: `2px solid ${theme === 'Light' ? colors.brandPrimary : colors.borderLight}`,
                  borderRadius: '8px',
                  backgroundColor: theme === 'Light' ? `${colors.brandPrimary}10` : 'transparent',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  color: theme === 'Light' ? colors.brandPrimary : colors.textSecondary,
                }}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '24px' }}>
          <Button>Save Preferences</Button>
        </div>
      </div>
    </Card>
  );

  const renderRolesSettings = () => (
    <Card title="Roles & Permissions" subtitle="Manage system roles and users">
      <div style={{ maxWidth: '800px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>System Roles</h4>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: '14px' }}>
              Assign roles to control user access.
            </p>
          </div>
          <Button icon={Plus}>Add Role</Button>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            { name: 'Admin', description: 'Full access to all modules and system settings.', users: 3 },
            { name: 'Data Manager', description: 'Can add, edit, and safely manage CRM application data.', users: 5 },
          ].map((role, idx) => (
            <div key={idx} style={{
              padding: '20px',
              border: `1px solid ${colors.borderLight}`,
              backgroundColor: colors.appBg,
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: colors.textPrimary, fontSize: '16px' }}>{role.name}</h4>
                <div style={{ fontSize: '13px', color: colors.textSecondary }}>{role.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '500' }}>
                  {role.users} Users
                </span>
                <Button variant="ghost" size="small">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'preferences':
        return renderPreferencesSettings();
      case 'roles':
        return renderRolesSettings();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div style={tabContainerStyle}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              style={getTabStyle(activeTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={isMobile ? 16 : 18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default Settings;
