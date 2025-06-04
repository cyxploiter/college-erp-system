
import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card p-8 rounded-lg shadow-md border border-border">
        <h1 className="text-3xl font-bold text-foreground mb-6 text-center">College ERP System Monorepo</h1>
        <p className="text-muted-foreground text-center mb-4">
          This is the root of the monorepo. The main applications are located in the <code>/apps</code> directory.
        </p>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-primary mb-2">Frontend Application (Next.js)</h2>
            <p className="text-foreground">
              Navigate to <code>apps/frontend</code> and run <code>pnpm dev</code> to start the frontend.
              Typically available at <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">http://localhost:3000</a>.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary mb-2">Backend Application (Express.js)</h2>
            <p className="text-foreground">
              Navigate to <code>apps/backend</code> and run <code>pnpm dev</code> to start the backend.
              Typically available at <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">http://localhost:3001</a>.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-8 text-center">
          Please refer to the <code>README.md</code> for full setup and development instructions.
        </p>
      </div>
    </div>
  );
};

export default App;
