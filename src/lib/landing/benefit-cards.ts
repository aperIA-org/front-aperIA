/** Os 3 diferenciais, cada um com um ícone de 52×52 (stroke 1.7). */
export type BenefitCard = {
  icon: 'gauge' | 'cloudExchange' | 'cloudFlow';
  title: string;
  body: string;
};

export const BENEFIT_CARDS: readonly BenefitCard[] = [
  {
    icon: 'gauge',
    title: 'Priorize riscos validados, não mais alertas.',
    body: 'A aperIA valida quais vulnerabilidades representam caminhos de ataque reais usando exposição na nuvem, contexto de tempo de execução e testes adversários, para que suas equipes corrijam o pequeno conjunto de problemas que representam um risco genuíno para os negócios.',
  },
  {
    icon: 'cloudExchange',
    title: 'Rastreabilidade do código à nuvem',
    body: 'Vincule os problemas de código ao contexto da nuvem em tempo real e rastreie-os até a origem exata, o repositório, o commit e o proprietário, para que as equipes possam entender o impacto e corrigir o problema na raiz.',
  },
  {
    icon: 'cloudFlow',
    title: 'Criado para fluxos de trabalho de desenvolvedores',
    body: 'Reduza a troca de contexto ao interagir com os desenvolvedores onde eles trabalham, expondo riscos validados diretamente em pull requests, IDEs e pipelines de CI/CD, com responsabilidades claras e correções práticas para acelerar a remediação sem interromper a entrega.',
  },
];
