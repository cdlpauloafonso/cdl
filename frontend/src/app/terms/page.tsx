import type { Metadata } from 'next';
import { LegalDocLayout } from '@/components/legal/LegalDocLayout';

export const metadata: Metadata = {
  title: 'Termos de Uso | CDL Paulo Afonso',
  description: 'Termos de uso do site e aplicativo da CDL Paulo Afonso.',
  robots: { index: true, follow: true },
};

const UPDATED = '18 de maio de 2026';

export default function TermsPage() {
  return (
    <LegalDocLayout title="Termos de Uso" updatedAt={UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">1. Aceitação</h2>
        <p>
          Ao acessar o site ou o aplicativo da <strong>CDL Paulo Afonso</strong>, você concorda com estes
          termos. Se não concordar, não utilize nossos canais digitais.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">2. Serviços</h2>
        <p>
          Disponibilizamos conteúdo institucional, informações sobre associados, eventos, benefícios e
          formulários de interesse. O app é um meio de acesso a esses serviços; funcionalidades podem mudar
          sem aviso prévio.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">3. Uso adequado</h2>
        <p>Você se compromete a:</p>
        <ul>
          <li>fornecer informações verdadeiras nos formulários;</li>
          <li>não tentar acessar áreas restritas, interferir no sistema ou usar o app de forma ilícita;</li>
          <li>respeitar direitos de terceiros e a legislação vigente.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">4. Conta e áreas restritas</h2>
        <p>
          Áreas administrativas e de associados exigem autenticação. É sua responsabilidade manter credenciais
          em sigilo. A CDL pode suspender acessos em caso de uso indevido ou suspeita de fraude.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">5. Propriedade intelectual</h2>
        <p>
          Textos, marcas, logotipos e demais conteúdos exibidos pertencem à CDL Paulo Afonso ou a licenciadores,
          salvo indicação em contrário. Não é permitida cópia ou redistribuição sem autorização.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">6. Limitação de responsabilidade</h2>
        <p>
          Empregamos esforços razoáveis para manter o site e o app disponíveis e corretos, mas não garantimos
          ausência de erros ou interrupções. Conteúdos informativos não substituem orientação jurídica,
          contábil ou comercial específica.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">7. Privacidade</h2>
        <p>
          O tratamento de dados pessoais segue nossa Política de Privacidade, disponível em{' '}
          <span className="text-cdl-gray-text">/privacy</span> (referência para o app e lojas).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">8. Alterações e lei aplicável</h2>
        <p>
          Estes termos podem ser atualizados a qualquer momento; a data no topo indica a versão vigente. Aplica-se
          a legislação brasileira, com foro na comarca de Paulo Afonso/BA, salvo disposição legal em contrário.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">9. Contato</h2>
        <p>
          Para dúvidas sobre estes termos, utilize os canais oficiais de atendimento da CDL Paulo Afonso no
          site institucional.
        </p>
      </section>
    </LegalDocLayout>
  );
}
