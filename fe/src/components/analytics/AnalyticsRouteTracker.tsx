import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';
import { trackProductPageView } from '@/lib/productAnalytics';

const AnalyticsRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    trackPageView(path);
    trackProductPageView(path);
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsRouteTracker;
