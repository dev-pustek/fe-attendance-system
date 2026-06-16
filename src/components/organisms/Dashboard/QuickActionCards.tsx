import React from 'react';
import { Link } from 'react-router';

export interface QuickActionCardProps {
  title: string;
  description: string;
  link: string;
}

export default function QuickActionCards({ actions }: { actions: QuickActionCardProps[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6 mb-8">
      {actions.map((action, index) => (
        <div key={index} className="flex flex-col justify-between rounded-2xl bg-[#4b4e9e] p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
            <p className="text-sm text-white/80 leading-relaxed mb-6">
              {action.description}
            </p>
          </div>
          <Link 
            to={action.link} 
            className="inline-flex w-fit items-center justify-center rounded-lg bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Lanjut
          </Link>
        </div>
      ))}
    </div>
  );
}
