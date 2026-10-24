import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AiChatPanel from '../components/ai/AiChatPanel';
import Modal from '../components/ui/Modal';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleAiChat={() => setAiChatOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Slide-over Global AI Assistant Modal */}
      {aiChatOpen && (
        <Modal
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
          maxWidth="max-w-xl"
          showClose={false}
        >
          <div className="h-[600px] -m-6">
            <AiChatPanel isOpen={true} onClose={() => setAiChatOpen(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
