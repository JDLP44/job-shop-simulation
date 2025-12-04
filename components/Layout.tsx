import React from "react";
import { Package, Truck, Activity, HelpCircle } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  onHelpClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onHelpClick }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <header className="bg-white border-b border-red-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">JobShop<span className="text-red-600">Sim</span></h1>
              <p className="text-xs text-gray-500">Discrete Event Simulation & Optimization</p>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm font-medium text-gray-600">
             <span className="flex items-center gap-1 hidden sm:flex"><Package className="h-4 w-4"/> Inventory Mgmt</span>
             <span className="flex items-center gap-1 hidden sm:flex"><Truck className="h-4 w-4"/> Logistics</span>
             <button 
               onClick={onHelpClick}
               className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md"
             >
               <HelpCircle className="h-4 w-4"/> Help / Tutorial
             </button>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 text-center text-sm text-gray-500">
          Job Shop Simulator • Built with React & TypeScript
        </div>
      </footer>
    </div>
  );
};

export default Layout;