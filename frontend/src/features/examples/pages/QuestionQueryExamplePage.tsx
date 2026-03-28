import { useMsal } from '@azure/msal-react';

import ExampleManager from '../components/QuestionQueryExample';

const QuestionQueryExamplePage: React.FC = () => {
  const { instance: msalInstance } = useMsal();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Questions / SQL examples</h2>
      <ExampleManager msalInstance={msalInstance} />
    </div>
  );
};

export default QuestionQueryExamplePage;
