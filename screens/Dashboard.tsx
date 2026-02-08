import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="relative flex flex-col h-full overflow-hidden w-full bg-background-light">
      {/* Background Image Container */}
      <div className="absolute inset-0 w-full h-full z-0">
        <img
          alt="Retail store exterior with large red facade"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAG3CNUSVUcZKsesRYXyWm8V6pbFXfMCFNU7MjE-zUn5eD_jEYtWiuAeajJOGHII8uNyEJJZAQoF8kBhpd6zaEH_Iht1hANG43kJUN0vJbEHKqHP4ipBHUqDw53WBo4vrpcIruyhSrVGutBSzk-jXymd0_qFkmUkIB27H_brUrr2WL1NwHQp8ET7EKnPSPB4819wwsofsBpSJ92m6mau2CzQc3UvXPdGpgK7e473ME5oGOD350aLlFPK7b8iwaNyFhdtyty_MAQ8A"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/90"></div>
      </div>

      {/* Header Overlay for Dashboard specifically */}
      <header className="h-16 flex items-center justify-between px-6 z-30 shrink-0 w-full">
         {/* Sidebar toggle or logo placeholder if needed, though sidebar is persistent on left */}
         <div />
         <div className="flex items-center space-x-6">
            <div className="hidden md:flex flex-col items-end">
                <span className="text-white text-sm font-medium">Wanderson Barbosa</span>
                <span className="text-gray-400 text-xs">Administrador</span>
            </div>
             <button className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors border border-gray-600 px-3 py-1.5 rounded-md hover:border-gray-400 bg-gray-900/50 backdrop-blur-sm">
                <span className="material-symbols-outlined text-sm">logout</span>
                <span className="text-sm font-medium">Sair</span>
            </button>
         </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-6 md:p-10 lg:p-16">
        <div className="flex justify-between items-start">
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/20 transform rotate-2 hidden md:block">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tighter">
              max
              <span className="text-secondary text-base block font-normal tracking-normal -mt-1">
                atacado
              </span>
            </h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-start max-w-4xl animate-fade-in-up">
          <div className="inline-flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 mb-6">
            <span className="material-symbols-outlined text-primary text-base mr-2">calendar_today</span>
            <span className="text-gray-100 text-sm md:text-base font-medium tracking-wide capitalize">
              Segunda-feira, 24 de Maio De 2024
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-xl tracking-tight leading-tight">
            Olá, Wanderson
          </h1>
          <p className="text-2xl md:text-3xl text-gray-200 font-light drop-shadow-lg tracking-wide">
            Bem-vindo de volta!
          </p>
        </div>
        <div className="text-center text-gray-400 text-xs mt-auto">
          <p>© 2024 PontoMax Varejo. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
