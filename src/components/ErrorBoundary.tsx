import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Generic Error Boundary that catches rendering errors in child components
 * without crashing the entire application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h2 className="text-lg font-bold text-card-foreground">Algo deu errado</h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Ocorreu um erro inesperado neste componente. Tente recarregar a página.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleReset}
                            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                            Tentar novamente
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-xl bg-muted px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Recarregar página
                        </button>
                    </div>
                    {import.meta.env.DEV && this.state.error && (
                        <details className="mt-4 w-full max-w-lg text-left">
                            <summary className="cursor-pointer text-xs text-muted-foreground">Detalhes do erro</summary>
                            <pre className="mt-2 overflow-auto rounded-xl bg-muted p-4 text-xs text-muted-foreground">
                                {this.state.error.message}
                                {"\n\n"}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
