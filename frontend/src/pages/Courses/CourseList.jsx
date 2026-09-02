import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, GraduationCap, MapPin, Clock, Wallet, Award } from 'lucide-react';
import { Card, Button, SearchInput, Alert, Badge, AdvancedSearchModal } from '../../components';
import { ADVANCED_SEARCH_DEFAULTS } from '../../components/AdvancedSearchModal';
import { courseService, buildCourseQuery } from '../../services/courseService';
import { colors } from '../../theme';

const money = (amount, currency) => {
  if (amount == null) return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `${currency ? `${currency} ` : ''}${n.toLocaleString()}`;
};

const CourseList = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageInfo, setPageInfo] = useState({ cursor: null, hasNext: false });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  // null = plain text search; otherwise the advanced-search payload in effect
  const [advanced, setAdvanced] = useState(null);
  const [advancedForm, setAdvancedForm] = useState(ADVANCED_SEARCH_DEFAULTS);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchPage = useCallback(async (cursor) => {
    if (advanced) {
      return courseService.searchAdvanced({ ...buildCourseQuery(advanced), cursor });
    }
    return courseService.search({ searchText: searchQuery, cursor });
  }, [advanced, searchQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { courses: data, pagination } = await fetchPage(null);
      setCourses(data);
      setPageInfo({ cursor: pagination?.cursor ?? null, hasNext: !!pagination?.hasNext });
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError(err.message || 'Failed to load courses.');
      setCourses([]);
      setPageInfo({ cursor: null, hasNext: false });
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  // Debounced: text search re-runs as you type, advanced re-runs when applied.
  useEffect(() => {
    const timer = setTimeout(load, 350);
    return () => clearTimeout(timer);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!pageInfo.hasNext || !pageInfo.cursor) return;
    setLoadingMore(true);
    setError('');
    try {
      const { courses: data, pagination } = await fetchPage(pageInfo.cursor);
      setCourses((prev) => [...prev, ...data]);
      setPageInfo({ cursor: pagination?.cursor ?? null, hasNext: !!pagination?.hasNext });
    } catch (err) {
      console.error('Failed to load more courses:', err);
      setError(err.message || 'Failed to load more courses.');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, pageInfo.hasNext, pageInfo.cursor]);

  // Auto-load the next page when the sentinel below the grid scrolls into view.
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!pageInfo.hasNext) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !loading) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageInfo.hasNext, loadingMore, loading, loadMore]);

  const openUniversity = (e, course) => {
    e.stopPropagation();
    if (!course.university?.id) return;
    // The backend has no university endpoint, so pass what the course gave us
    // through router state; the details page falls back to it.
    navigate(`/universities/${course.university.id}`, { state: { university: course.university } });
  };

  const activeFilterCount = advanced
    ? [
      advanced.countryId, advanced.cityId, advanced.programmeId,
      advanced.intakeMonths?.length ? 'months' : null,
      advanced.hasScholarship != null ? 'scholarship' : null,
    ].filter(Boolean).length
    : 0;

  return (
    <div>
      {/* Search bar */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px',
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: '20px',
      }}>
        <SearchInput
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setAdvanced(null); }}
          placeholder="Search by course, university, or country..."
          style={{ flex: 1 }}
        />
        <Button
          variant={advanced ? 'primary' : 'secondary'}
          icon={SlidersHorizontal}
          onClick={() => setShowAdvanced(true)}
          style={{ flexShrink: 0 }}
        >
          Advanced Search{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </Button>
        {advanced && (
          <Button variant="ghost" onClick={() => { setAdvanced(null); setAdvancedForm(ADVANCED_SEARCH_DEFAULTS); }} style={{ flexShrink: 0 }}>
            Clear filters
          </Button>
        )}
      </div>

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
        {loading ? 'Loading...' : `${courses.length} course${courses.length === 1 ? '' : 's'}${pageInfo.hasNext ? ' so far' : ''}`}
      </div>

      {/* Course cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: colors.textSecondary }}>Loading courses...</div>
      ) : courses.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
            <GraduationCap size={44} style={{ opacity: 0.4, marginBottom: '10px' }} />
            <p>No courses matched your search.</p>
          </div>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px',
        }}>
          {courses.map((course) => (
            <Card key={course.id} padding="0" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Carry the search row over: it has durationMonths, which the
                  course-details endpoint does not return but the edit form
                  needs in order to prefill. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/courses/${course.id}`, { state: { course } })}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/courses/${course.id}`, { state: { course } }); }}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', flex: 1 }}
              >
                {/* Cover */}
                <div style={{ height: '150px', backgroundColor: colors.appBg, position: 'relative', overflow: 'hidden' }}>
                  {course.imgUrl ? (
                    <img
                      src={course.imgUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textMuted }}>
                      <GraduationCap size={36} />
                    </div>
                  )}
                  {course.intake?.name && (
                    <span style={{
                      position: 'absolute', top: '10px', right: '10px',
                      backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff',
                      padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
                    }}>
                      {course.intake.name}
                    </span>
                  )}
                </div>

                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary, lineHeight: 1.35 }}>
                    {course.name}
                  </h3>

                  {/* University - clickable, stops propagation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {course.university.logoUrl && (
                      <img
                        src={course.university.logoUrl}
                        alt=""
                        style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => openUniversity(e, course)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        color: colors.brandPrimary,
                        fontWeight: '600',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                        textDecoration: 'underline',
                      }}
                    >
                      {course.university.name || 'Unknown university'}
                    </button>
                  </div>

                  {(course.university.city || course.university.country) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.textSecondary }}>
                      <MapPin size={13} />
                      {[course.university.city, course.university.country].filter(Boolean).join(', ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: colors.textSecondary, marginTop: 'auto', paddingTop: '6px' }}>
                    {money(course.tuitionFee, course.currency) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Wallet size={13} /> {money(course.tuitionFee, course.currency)}
                      </span>
                    )}
                    {course.durationMonths != null && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} /> {course.durationMonths} mo
                      </span>
                    )}
                  </div>

                  {course.hasScholarship && (
                    <div>
                      <Badge variant="success" size="small">
                        <Award size={11} style={{ marginRight: '4px' }} /> Scholarship
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pageInfo.hasNext && <div ref={sentinelRef} style={{ height: '1px' }} />}

      {pageInfo.hasNext && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}

      <AdvancedSearchModal
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        initialValues={advancedForm}
        onSearch={({ _formState, ...payload }) => {
          setAdvancedForm(_formState);
          setSearchQuery('');
          setAdvanced(payload);
        }}
      />
    </div>
  );
};

export default CourseList;
