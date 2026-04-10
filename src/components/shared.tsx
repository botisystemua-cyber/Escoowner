import { Truck } from 'lucide-react';

export function Logo({ size = 'lg' }: { size?: 'lg' | 'md' | 'sm' }) {
  const sizeMap = {
    lg: { box: 'w-12 h-12 sm:w-14 sm:h-14', icon: 'w-6 h-6 sm:w-7 sm:h-7', text: 'text-3xl sm:text-4xl' },
    md: { box: 'w-10 h-10 sm:w-12 sm:h-12', icon: 'w-5 h-5 sm:w-6 sm:h-6', text: 'text-2xl sm:text-3xl' },
    sm: { box: 'w-9 h-9', icon: 'w-4.5 h-4.5', text: 'text-xl' },
  };
  const s = sizeMap[size];
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${s.box} rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20`}>
        <Truck className={`${s.icon} text-white`} />
      </div>
      <span className={`${s.text} font-black tracking-tight`}>
        <span className="text-text">Boti</span>
        <span className="text-success">Logistics</span>
      </span>
    </div>
  );
}
