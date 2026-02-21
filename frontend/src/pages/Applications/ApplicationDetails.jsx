import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  Upload,
  MessageSquare,
  Calendar,
  DollarSign,
  Plane,
  CreditCard,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components';
import { applicationService, journeyService } from '../../services';
import { colors } from '../../theme';

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [journeyEvents, setJourneyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadApplication();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const loadApplication = async () => {
    try {
      const appData = await applicationService.getById(id);
      setApplication(appData);

      if (appData?.leadId) {
        const events = await journeyService.getByLead(appData.leadId);
        setJourneyEvents(events);
      }
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return colors.textSecondary;
      case 'submitted': return colors.info;
      case 'under_review': return colors.warning;
      case 'conditional_offer': return colors.warning;
      case 'accepted': return colors.success;
      case 'enrolled': return colors.success;
      case 'rejected': return colors.error;
      case 'visa_processing': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const formatStatus = (status) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '';
  };

  const documentList = [
    { key: 'passport', label: 'Passport', required: true },
    { key: 'transcript', label: 'Academic Transcript', required: true },
    { key: 'englishTest', label: 'English Test Score', required: true },
    { key: 'sop', label: 'Statement of Purpose', required: false },
    { key: 'lor', label: 'Letter of Recommendation', required: false },
    { key: 'financialProof', label: 'Financial Proof', required: false },
    { key: 'cv', label: 'CV/Resume', required: false },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading application details...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: colors.textPrimary }}>Application not found</h2>
        <Button onClick={() => navigate('/applications')} style={{ marginTop: '16px' }}>
          Back to Applications
        </Button>
      </div>
    );
  }

  const statusSteps = [
    { key: 'Pending Review', label: 'Review', icon: Clock },
    { key: 'Application Submitted', label: 'Submitted', icon: Upload },
    { key: 'Conditional offer', label: 'Conditional', icon: AlertCircle },
    { key: 'Unconditional offer', label: 'Unconditional', icon: CheckCircle },
    { key: 'Interview', label: 'Interview', icon: UserCheck },
    { key: 'Payment', label: 'Payment', icon: CreditCard },
    { key: 'CAS/COE/120', label: 'CAS / COE', icon: FileText },
    { key: 'VISA', label: 'VISA', icon: Plane },
    { key: 'Enrolled', label: 'Enrolled', icon: ShieldCheck },
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === application.status);
  const isRejected = application.status === 'rejected';

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/applications')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: colors.textSecondary,
          cursor: 'pointer',
          marginBottom: '24px',
          fontSize: '14px',
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        <ArrowLeft size={18} />
        Back to Applications
      </button>

      {/* Header */}
      <Card style={{ marginBottom: '24px' }} padding={isMobile ? '20px' : '32px'}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '16px' : '0',
        }}>
          <div>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', color: colors.textPrimary }}>
                {application.course?.courseName}
              </h1>
              <Badge variant={isRejected ? 'error' : 'success'} size="large">
                {formatStatus(application.status)}
              </Badge>
            </div>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: isMobile ? '14px' : '16px' }}>
              {application.university?.uniName}
            </p>
            <div style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '24px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Applicant</span>
                <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                  {application.lead?.fullName}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Applied Date</span>
                <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                  {new Date(application.appliedDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Last Updated</span>
                <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                  {new Date(application.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px'
          }}>
            <Button variant="secondary" icon={MessageSquare} style={{ width: isMobile ? '100%' : 'auto' }}>Add Note</Button>
            <Button style={{ width: isMobile ? '100%' : 'auto' }}>Update Status</Button>
          </div>
        </div>
      </Card>

      {/* Status Progress */}
      {!isRejected && (
        <Card title="Application Progress" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0' }}>
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <React.Fragment key={step.key}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                    <div
                      style={{
                        width: isMobile ? '32px' : '40px',
                        height: isMobile ? '32px' : '40px',
                        borderRadius: '50%',
                        backgroundColor: isCompleted ? colors.success : colors.appBg,
                        border: `2px solid ${isCompleted ? colors.success : colors.borderLight}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isCompleted ? '#fff' : colors.textSecondary,
                        transition: 'all 0.3s ease',
                        zIndex: 2,
                      }}
                    >
                      <Icon size={isMobile ? 16 : 18} />
                    </div>
                    <span
                      style={{
                        marginTop: '8px',
                        fontSize: isMobile ? '10px' : '12px',
                        fontWeight: isCurrent ? '600' : '400',
                        color: isCompleted ? colors.textPrimary : colors.textSecondary,
                        textAlign: 'center',
                        maxWidth: '80px',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: '2px',
                        backgroundColor: index < currentStepIndex ? colors.success : colors.borderLight,
                        marginBottom: isMobile ? '24px' : '28px',
                        zIndex: 1,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      )}

      {/* Rejected Message */}
      {isRejected && (
        <Card style={{ marginBottom: '24px', border: `1px solid ${colors.error}` }} padding="24px">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: `${colors.error}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.error,
            }}>
              <XCircle size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: colors.error }}>Application Rejected</h3>
              <p style={{ margin: 0, color: colors.textSecondary }}>
                {application.rejectionReason || 'No reason provided'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '16px' : '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Documents */}
          <Card title="Documents">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documentList.map((doc) => {
                const isUploaded = application.documents?.includes(doc.key);
                return (
                  <div
                    key={doc.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: colors.appBg,
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isUploaded ? (
                        <CheckCircle size={18} color={colors.success} />
                      ) : (
                        <AlertCircle size={18} color={doc.required ? colors.warning : colors.textMuted} />
                      )}
                      <span style={{ color: colors.textPrimary }}>{doc.label}</span>
                      {doc.required && !isUploaded && (
                        <Badge variant="warning" size="small">Required</Badge>
                      )}
                    </div>
                    {isUploaded ? (
                      <Button variant="ghost" size="small" icon={Download}>Download</Button>
                    ) : (
                      <Button variant="secondary" size="small" icon={Upload}>Upload</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Notes */}
          <Card title="Notes & Comments">
            <div style={{ padding: '16px', backgroundColor: colors.appBg, borderRadius: '8px' }}>
              <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.6 }}>
                {application.notes || 'No notes available.'}
              </p>
            </div>
            {application.conditions && application.conditions.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: colors.textPrimary, fontSize: '14px' }}>
                  Conditions to Meet:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {application.conditions.map((condition, index) => (
                    <li key={index} style={{ color: colors.textSecondary, marginBottom: '8px' }}>
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Offer Details */}
          {application.offerLetterDate && (
            <Card title="Offer Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: `${colors.success}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.success,
                  }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>Offer Letter Date</div>
                    <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                      {new Date(application.offerLetterDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: `${application.depositPaid ? colors.success : colors.warning}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: application.depositPaid ? colors.success : colors.warning,
                  }}>
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>Deposit Status</div>
                    <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                      {application.depositPaid ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>
                {application.visaStatus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: `${application.visaStatus === 'approved' ? colors.success : colors.info}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: application.visaStatus === 'approved' ? colors.success : colors.info,
                    }}>
                      <Plane size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: colors.textSecondary }}>Visa Status</div>
                      <div style={{ fontWeight: '500', color: colors.textPrimary, textTransform: 'capitalize' }}>
                        {application.visaStatus}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card title="Recent Activity">
            {journeyEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {journeyEvents.slice(0, 5).map((event, index) => (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      paddingBottom: index < journeyEvents.length - 1 ? '16px' : 0,
                      borderLeft: index < journeyEvents.length - 1 ? `2px solid ${colors.borderLight}` : 'none',
                      marginLeft: '8px',
                      paddingLeft: '20px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '-6px',
                        top: '0',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: colors.brandPrimary,
                        border: `2px solid ${colors.contentSurface}`,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: colors.textPrimary, fontSize: '14px' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
                        {event.description}
                      </div>
                      <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '20px' }}>
                No activity recorded yet.
              </p>
            )}
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate(`/leads/${application.leadId}`)}>
                View Lead Profile
              </Button>
              <Button variant="secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate(`/universities/${application.university?.id}`)}>
                View University
              </Button>
              <Button variant="secondary" style={{ justifyContent: 'flex-start' }}>
                Send Email to Student
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetails;
