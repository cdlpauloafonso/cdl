'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AniversariosPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aniversários</h1>
          <p className="text-gray-600 mt-1">Gerencie os aniversariantes do mês</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500 py-8">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aniversariantes do Mês</h3>
          <p className="text-gray-600 mb-4">
            Funcionalidade em desenvolvimento. Em breve você poderá gerenciar os aniversariantes dos associados.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Recursos planejados:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Lista de aniversariantes do mês</li>
              <li>• Filtros por mês e categoria</li>
              <li>• Envio de mensagens de parabéns</li>
              <li>• Configurações de lembretes</li>
              <li>• Integração com sistema de associados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
