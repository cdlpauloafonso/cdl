import type { Metadata } from 'next';
import { LegalDocLayout } from '@/components/legal/LegalDocLayout';

export const metadata: Metadata = {
  title: 'Política de Privacidade | CDL Paulo Afonso',
  description: 'Política de privacidade do site e aplicativo da CDL Paulo Afonso.',
  robots: { index: true, follow: true },
};

const UPDATED = '18 de maio de 2026';

export default function PrivacyPage() {
  return (
    <LegalDocLayout title="Política de Privacidade" updatedAt={UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">1. Quem somos</h2>
        <p>
          Esta política descreve, de forma resumida, como a <strong>CDL Paulo Afonso</strong> trata dados
          pessoais no site e no aplicativo móvel associados aos nossos serviços digitais.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">2. Dados que podemos tratar</h2>
        <p>Conforme o uso do app ou do site, podemos receber ou armazenar, por exemplo:</p>
        <ul>
          <li>dados de identificação e contato (nome, e-mail, telefone, empresa);</li>
          <li>dados de cadastro de associados ou de formulários (inscrições, currículos, mensagens);</li>
          <li>dados técnicos básicos (tipo de dispositivo, navegador, logs de acesso).</li>
        </ul>
        <p>
          Solicitamos apenas o necessário para cada funcionalidade. Evite enviar informações sensíveis que não
          sejam pedidas.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">3. Finalidades</h2>
        <p>Utilizamos os dados para:</p>
        <ul>
          <li>prestar e melhorar nossos serviços e canais digitais;</li>
          <li>atender solicitações, inscrições e comunicação com associados;</li>
          <li>garantir segurança, prevenir abusos e cumprir obrigações legais, quando aplicável.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">4. Armazenamento e segurança</h2>
        <p>
          Os dados podem ser armazenados em provedores de nuvem (por exemplo, Firebase/Google), com acesso
          restrito a pessoas autorizadas e medidas técnicas razoáveis (autenticação, regras de acesso,
          conexão criptografada).
        </p>
        <p>
          Nenhum sistema é 100% seguro. Em caso de incidente relevante, buscaremos adotar medidas adequadas
          conforme a legislação.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">5. Compartilhamento</h2>
        <p>
          Não vendemos seus dados. Podemos compartilhá-los apenas com prestadores que nos auxiliam na
          operação do site/app (hospedagem, e-mail, analytics), sempre dentro do necessário, ou quando
          exigido por lei.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">6. Seus direitos</h2>
        <p>
          Você pode solicitar informações, correção ou exclusão de dados pessoais que tratamos, nos limites
          da lei (LGPD). Entre em contato pelos canais oficiais da CDL Paulo Afonso.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">7. Retenção e alterações</h2>
        <p>
          Mantemos os dados pelo tempo necessário às finalidades acima ou exigências legais. Esta política
          pode ser atualizada; a data no topo indica a versão vigente.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">8. Contato</h2>
        <p>
          Dúvidas sobre privacidade: utilize os canais de atendimento disponíveis no site institucional da
          CDL Paulo Afonso.
        </p>
      </section>
    </LegalDocLayout>
  );
}
