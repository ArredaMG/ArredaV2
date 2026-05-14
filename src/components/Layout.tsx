import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileSpreadsheet, Users, Moon, Sun, LogOut, CalendarDays } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

import { useNavigate } from 'react-router-dom';

export const Layout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileSpreadsheet, label: 'Orçamentos', path: '/orcamentos' },
    { icon: Users, label: 'Recursos', path: '/recursos' },
    { icon: CalendarDays, label: 'Agenda', path: '/calendario' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F5F5F7] dark:bg-[#000000] text-gray-900 dark:text-gray-100 transition-colors duration-200 font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1E] print:hidden">
        <div className="p-6 flex items-center justify-between">
          <div className="text-[#ff6b00] dark:text-[#ff8c00]">
            <svg 
              id="Layer_2" 
              data-name="Layer 2" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 245.66 31.69"
              className="h-6 w-auto fill-current"
            >
              <g id="Layer_1-2" data-name="Layer 1">
                <g>
                  <g>
                    <path d="M210.86,11.37h14.8l9.9,20.31h-7.38l-1.78-3.71h-16.21l-1.78,3.71h-7.41l9.87-20.31ZM224.05,23.17l-3-6.2h-5.57l-2.97,6.2h11.54Z"/>
                    <path d="M9.87,11.37h14.8l9.9,20.31h-7.38l-1.78-3.71H9.2l-1.78,3.71H0L9.87,11.37ZM23.06,23.17l-3-6.2h-5.57l-2.97,6.2h11.54Z"/>
                    <path d="M36.25,11.37h33.88c5.57,0,8.35,2.12,8.35,6.22,0,2.8-1.53,4.64-4.27,5.46,2.6.17,4.24,1.67,4.24,4.16v4.47h-6.65v-3.4c0-1.81-.51-2.35-2.32-2.35h-26.58v5.74h-6.65V11.37ZM68.55,20.62c1.78,0,3-.34,3-1.98s-1.22-1.95-3-1.95h-25.65v3.93h25.65Z"/>
                    <path d="M80.15,11.37h35.37c5.57,0,8.35,2.12,8.35,6.22,0,2.8-1.53,4.64-4.27,5.46,2.6.17,4.24,1.67,4.24,4.16v4.47h-6.65v-3.4c0-1.81-.51-2.35-2.32-2.35h-28.07v5.74h-6.65V11.37ZM113.93,20.62c1.78,0,3-.34,3-1.98s-1.22-1.95-3-1.95h-27.13v3.93h27.13Z"/>
                    <path d="M126,11.37h34.86v5.01h-28.21v2.86h27.64v4.56h-27.64v2.89h28.21v5.01h-34.86V11.37Z"/>
                    <path d="M164.41,11.37h25.75c5.88,0,10.16,4.24,10.16,10.13s-4.27,10.19-10.16,10.19h-25.75V11.37ZM187.47,26.08c4.02,0,5.97-1.53,5.97-4.58s-1.95-4.53-5.97-4.53h-16.41v9.11h16.41Z"/>
                  </g>
                  <path d="M233.95,4.66c0-2.83,2.33-4.66,5.98-4.66s5.72,1.82,5.72,4.66-2.23,4.68-5.72,4.68-5.98-1.82-5.98-4.68ZM239.94,7.97c2.57,0,4.2-1.29,4.2-3.31s-1.63-3.28-4.2-3.28c-2.74,0-4.48,1.28-4.48,3.28s1.73,3.31,4.48,3.31ZM237.39,2.29h3.48c1.23,0,1.99.61,1.99,1.58,0,.71-.35,1.21-.91,1.45l.99,1.49h-1.86l-.72-1.2h-1.44v1.2h-1.52V2.29ZM240.62,4.43c.43,0,.67-.18.67-.47s-.24-.46-.67-.46h-1.71v.92h1.71Z"/>
                </g>
              </g>
            </svg>
          </div>
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

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Container Principal: Responsável pelo Layout, NÃO pelo Scroll Master */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
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
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[72px] text-red-500 hover:text-red-700"
          >
            <LogOut size={24} />
            <span className="text-[10px] font-medium">Sair</span>
          </button>
        </div>
      </nav>

    </div>
  );
};
