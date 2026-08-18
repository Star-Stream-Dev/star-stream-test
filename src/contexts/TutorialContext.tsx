import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action: string; // What the user needs to do
  targetSelector?: string; // CSS selector for the element to highlight
  position: 'left' | 'right' | 'top' | 'bottom' | 'center';
  requiresAction: boolean; // Whether user must do something to proceed
  actionType?: 'hover' | 'click' | 'navigate' | 'auto'; // Type of action required
}

interface TutorialContextType {
  showTutorial: boolean;
  currentStep: number;
  steps: TutorialStep[];
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  completeAction: () => void;
  actionCompleted: boolean;
  hasCompletedTutorial: boolean;
  setActiveSection: (section: string) => void;
  activeSection: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = 'starstream_tutorial_completed';

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Star Stream! 🌟',
    description: 'Let\'s take a quick tour of the app. Follow the instructions to learn how everything works!',
    action: 'Click "Next" to begin',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
  {
    id: 'sidebar-hover',
    title: 'Navigation Sidebar',
    description: 'The sidebar is your main navigation hub. It\'s hidden by default to give you more space.',
    action: '👈 Hover over the left edge of the screen to reveal the sidebar',
    targetSelector: '.tutorial-sidebar-trigger',
    position: 'right',
    requiresAction: true,
    actionType: 'hover',
  },
  {
    id: 'sidebar-explore',
    title: 'Sidebar Revealed!',
    description: 'Great! You can see all the different sections here. Each icon takes you to a different part of the app.',
    action: 'Click on "Games" in the sidebar',
    targetSelector: '.tutorial-games-nav',
    position: 'right',
    requiresAction: true,
    actionType: 'click',
  },
  {
    id: 'games-section',
    title: 'Games Section 🎮',
    description: 'This is where you\'ll find all the games. Click on any game card to play! Some games embed directly, others open in new tabs.',
    action: 'Click "Next" to continue',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
  {
    id: 'nav-music',
    title: 'Let\'s Check Out Music',
    description: 'Open the sidebar again and navigate to the Music section.',
    action: '👈 Hover the left edge, then click "Music"',
    targetSelector: '.tutorial-sidebar-trigger',
    position: 'right',
    requiresAction: true,
    actionType: 'navigate',
  },
  {
    id: 'music-section',
    title: 'Music Player 🎵',
    description: 'Listen to music while browsing! The mini player stays visible so you can control playback from anywhere in the app.',
    action: 'Click "Next" to continue',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
  {
    id: 'nav-chatroom',
    title: 'Now Let\'s Visit the Chatroom',
    description: 'The chatroom is where you can talk with other users and make friends.',
    action: '👈 Open the sidebar and click "Chat"',
    targetSelector: '.tutorial-sidebar-trigger',
    position: 'right',
    requiresAction: true,
    actionType: 'navigate',
  },
  {
    id: 'chatroom-section',
    title: 'Chatroom & Friends 💬',
    description: 'Chat with other users here! You can send messages, add friends, and have private conversations.',
    action: 'Click "Next" to learn about friend requests',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
  {
    id: 'friend-requests',
    title: 'Friend Requests ✉️',
    description: 'When someone sends you a friend request, a notification pops up in the top-right. Click ✓ to accept or ✗ to decline. You can also find pending requests in the chatroom sidebar.',
    action: 'Click "Next" to continue',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
  {
    id: 'admin-friend',
    title: 'You\'re Friends with Admin! 🤝',
    description: 'Good news! You\'ve been automatically added as a friend with the Admin account. You can message them directly if you need help!',
    action: 'Click "Next" to continue',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
  {
    id: 'nav-settings',
    title: 'Final Stop: Settings',
    description: 'Let\'s check out the settings to customize your experience.',
    action: '👈 Open the sidebar and click "Settings"',
    targetSelector: '.tutorial-sidebar-trigger',
    position: 'right',
    requiresAction: true,
    actionType: 'navigate',
  },
  {
    id: 'settings-section',
    title: 'Settings & Customization ⚙️',
    description: 'Personalize everything here! Change themes, set custom backgrounds, enable snowfall effects, and more.',
    action: 'Click "Next" to continue',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
  {
    id: 'keybinds',
    title: 'Keyboard Shortcuts ⌨️',
    description: 'Quick tip: Press R for panic button (redirects to Google), G or F11 to exit fullscreen. These work everywhere except in the chatroom.',
    action: 'Click "Finish" to complete the tutorial',
    position: 'center',
    requiresAction: false,
    actionType: 'auto',
  },
];

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if user has completed tutorial
  useEffect(() => {
    if (!user) return;
    
    const completedUsers = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || '[]');
    const hasCompleted = completedUsers.includes(user.id);
    
    setHasCompletedTutorial(hasCompleted);
    
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Watch for sidebar hover during step 1
  useEffect(() => {
    if (!showTutorial) return;
    const step = tutorialSteps[currentStep];
    
    if (step.id === 'sidebar-hover' && sidebarOpen) {
      setActionCompleted(true);
    }
  }, [currentStep, sidebarOpen, showTutorial]);

  // Watch for navigation to games
  useEffect(() => {
    if (!showTutorial) return;
    const step = tutorialSteps[currentStep];
    
    if (step.id === 'sidebar-explore' && activeSection === 'games') {
      setActionCompleted(true);
    }
  }, [currentStep, activeSection, showTutorial]);

  // Watch for navigation to music
  useEffect(() => {
    if (!showTutorial) return;
    const step = tutorialSteps[currentStep];
    
    if (step.id === 'nav-music' && activeSection === 'music') {
      setActionCompleted(true);
    }
  }, [currentStep, activeSection, showTutorial]);

  // Watch for navigation to chatroom
  useEffect(() => {
    if (!showTutorial) return;
    const step = tutorialSteps[currentStep];
    
    if (step.id === 'nav-chatroom' && activeSection === 'chatroom') {
      setActionCompleted(true);
    }
  }, [currentStep, activeSection, showTutorial]);

  // Watch for navigation to settings
  useEffect(() => {
    if (!showTutorial) return;
    const step = tutorialSteps[currentStep];
    
    if (step.id === 'nav-settings' && activeSection === 'settings') {
      setActionCompleted(true);
    }
  }, [currentStep, activeSection, showTutorial]);

  const markTutorialComplete = useCallback(() => {
    if (!user) return;
    
    const completedUsers = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || '[]');
    if (!completedUsers.includes(user.id)) {
      completedUsers.push(user.id);
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(completedUsers));
    }
    setHasCompletedTutorial(true);
    setShowTutorial(false);
    setCurrentStep(0);
    setActiveSection('home');
  }, [user]);

  const nextStep = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setActionCompleted(false);
    } else {
      markTutorialComplete();
    }
  }, [currentStep, markTutorialComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setActionCompleted(false);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    markTutorialComplete();
  }, [markTutorialComplete]);

  const completeTutorial = useCallback(() => {
    markTutorialComplete();
  }, [markTutorialComplete]);

  const completeAction = useCallback(() => {
    setActionCompleted(true);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        showTutorial,
        currentStep,
        steps: tutorialSteps,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        completeAction,
        actionCompleted,
        hasCompletedTutorial,
        setActiveSection,
        activeSection,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
