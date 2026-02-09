import React, { useState } from 'react';
import { View } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './screens/Dashboard';
import GoalsConfiguration from './screens/GoalsConfiguration';
import HierarchicalGoals from './screens/HierarchicalGoals';
import GoalsHistory from './screens/GoalsHistory';
import ExpenseAnalysis from './screens/ExpenseAnalysis';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [goalsData, setGoalsData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);

  const handleProcessGoals = (data: any[]) => {
    setGoalsData(data);
    setCurrentView(View.GOALS_HIERARCHY);
  };

  const handleProcessExpenses = (data: any[]) => {
    setExpenseData(data);
    setCurrentView(View.EXPENSE_ANALYSIS);
  };

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard />;
      case View.GOALS_CONFIG:
        return (
          <GoalsConfiguration
            onHistoryClick={() => setCurrentView(View.GOALS_HISTORY)}
            onNavigateToHierarchy={() => setCurrentView(View.GOALS_HIERARCHY)}
            onProcessGoals={handleProcessGoals}
          />
        );
      case View.GOALS_HIERARCHY:
        return <HierarchicalGoals 
          onBack={() => setCurrentView(View.GOALS_CONFIG)} 
          initialData={goalsData}
        />;
      case View.GOALS_HISTORY:
        return <GoalsHistory onCreateNew={() => setCurrentView(View.GOALS_CONFIG)} />;
      case View.EXPENSE_ANALYSIS:
        return (
            <ExpenseAnalysis 
                onBack={() => setCurrentView(View.DASHBOARD)}
                initialData={expenseData}
            />
        );
      default:
        return <Dashboard />;
    }
  };

  const isDashboard = currentView === View.DASHBOARD;

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden bg-background-light">
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        isDashboard={isDashboard}
      />
      
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {!isDashboard && <Header currentView={currentView} />}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
