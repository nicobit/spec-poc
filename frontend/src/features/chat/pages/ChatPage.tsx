import { useState } from 'react';
import { Menu as FaBars, X as FaTimes } from 'lucide-react';

import Chat from '../components/Chat';
import SessionSidebar from '../components/SessionSidebar';

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-[87vh] overflow-hidden">
      <div className="flex h-[calc(100%-60px)]">
        <div className="relative flex">
          {isSidebarOpen && (
            <div className="w-64 overflow-hidden transition-all duration-300">
              <SessionSidebar />
            </div>
          )}
          <button
            className={`top-4 ${isSidebarOpen ? 'left-48' : 'left-0'} h-8 rounded-full bg-gray-300 p-2 text-white shadow-lg transition-all duration-300 dark:bg-gray-800`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <FaTimes className="h-4 w-4" /> : <FaBars className="h-4 w-4" />}
          </button>
        </div>
        <div className="box-border flex w-full flex-grow flex-col overflow-hidden p-4">
          <Chat />
        </div>
      </div>
    </div>
  );
}
