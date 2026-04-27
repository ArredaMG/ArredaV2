import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileSpreadsheet, Users, Moon, Sun } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileSpreadsheet, label: 'Orçamentos', path: '/orcamentos' },
    { icon: Users, label: 'Recursos', path: '/recursos' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F5F5F7] dark:bg-[#000000] text-gray-900 dark:text-gray-100 transition-colors duration-200 font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1E] print:hidden">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-[#ff6b00] dark:text-[#ff8c00]">
            Arreda v2
          </h1>
        </div>
        
        <nav id="menu-principal" className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-tooltip={item.label}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                isActive 
                  ? "bg-[#ff6b00]/10 text-[#ff6b00] dark:bg-[#ff8c00]/10 dark:text-[#ff8c00]" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md pb-safe z-40 print:hidden">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-tooltip={item.label}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[72px]",
                isActive 
                  ? "text-[#ff6b00] dark:text-[#ff8c00]" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={24} className={cn(isActive && "mb-1")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
};
