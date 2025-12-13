import { Component, ErrorInfo, ReactNode } from 'react';
import { InlineNotification } from '@carbon/react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch and handle errors in child components
 * Prevents the entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // TODO: Send error to logging service in production
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={{ padding: '1rem' }}>
          <InlineNotification
            kind="error"
            title="Something went wrong"
            subtitle={
              process.env.NODE_ENV === 'development'
                ? this.state.error?.message || 'An unexpected error occurred'
                : 'An unexpected error occurred. Please refresh the page.'
            }
            lowContrast
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
