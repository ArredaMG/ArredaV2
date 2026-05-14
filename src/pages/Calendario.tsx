import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Calendario: React.FC = () => {
  const { projects } = useAppContext();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysArray = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // padding before (empty cells)
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // days in month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // padding after
    const remaining = days.length % 7;
    if (remaining !== 0) {
      for (let i = 0; i < 7 - remaining; i++) {
        days.push(null);
      }
    }
    
    return days;
  };

  const days = getDaysArray();
  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatDateToYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-[#000000]">
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 px-8 py-6 z-10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-[#ff6b00]" />
              Calendário
            </h1>
            
            <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-1">
              <button 
                onClick={goToPrevMonth}
                className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-600 dark:text-zinc-300"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100 w-40 text-center capitalize">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button 
                onClick={goToNextMonth}
                className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-600 dark:text-zinc-300"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <main className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col bg-white dark:bg-[#1C1C1E] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151515] shrink-0">
            {weekDays.map((day, i) => (
              <div key={day} className={`py-3 text-center text-xs font-black uppercase tracking-widest text-zinc-500 ${i !== 6 ? 'border-r border-zinc-200 dark:border-zinc-800' : ''}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar">
            {days.map((date, index) => {
              if (!date) {
                return (
                  <div 
                    key={`empty-${index}`} 
                    className={`bg-zinc-50/50 dark:bg-[#151515]/50 border-zinc-100 dark:border-zinc-800/50
                      ${(index + 1) % 7 !== 0 ? 'border-r' : ''} 
                      ${index >= days.length - 7 ? '' : 'border-b'}
                    `}
                  />
                );
              }

              const dateStr = formatDateToYYYYMMDD(date);
              const isToday = dateStr === formatDateToYYYYMMDD(new Date());
              
              // Find projects for this date
              const dayProjects = projects.filter(p => {
                if (p.recordingDates && p.recordingDates.length > 0) {
                  return p.recordingDates.includes(dateStr);
                }
                // Fallback to legacy startDate / endDate
                if (p.startDate && p.endDate) {
                  const start = new Date(p.startDate);
                  start.setHours(0,0,0,0);
                  const end = new Date(p.endDate);
                  end.setHours(23,59,59,999);
                  return date >= start && date <= end;
                }
                return false;
              });

              return (
                <div 
                  key={dateStr} 
                  className={`
                    p-2 flex flex-col gap-1 transition-colors group relative
                    ${isToday ? 'bg-[#ff6b00]/5 dark:bg-[#ff6b00]/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}
                    ${(index + 1) % 7 !== 0 ? 'border-r border-zinc-200 dark:border-zinc-800' : ''} 
                    ${index >= days.length - 7 ? '' : 'border-b border-zinc-200 dark:border-zinc-800'}
                  `}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#ff6b00] text-white' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar">
                    {dayProjects.slice(0, 3).map(p => {
                      let colorClass = '';
                      if (p.status === 'Aprovado') colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60';
                      else if (p.status === 'Concluído') colorClass = 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700';
                      else colorClass = 'bg-[#ff6b00] text-white hover:bg-[#e66000]';

                      return (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/orcamentos/${p.id}`)}
                          className={`text-[10px] font-bold truncate px-2 py-1 rounded w-full text-left transition-all ${colorClass}`}
                          title={`${p.title} (${p.status})`}
                        >
                          {p.title}
                        </button>
                      );
                    })}
                    {dayProjects.length > 3 && (
                      <span className="text-[10px] font-bold text-zinc-400 text-center mt-0.5 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-default">
                        +{dayProjects.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
};
