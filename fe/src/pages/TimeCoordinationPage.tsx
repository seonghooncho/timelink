import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import TabBar from '@/components/common/TabBar';
import CoordinationOneTime from '@/components/coordination/CoordinationOneTime';
import CoordinationRepeat from '@/components/coordination/CoordinationRepeat';

const TABS = [
  { key: 'once', label: '한 번만' },
  { key: 'repeat', label: '반복' },
];

const TimeCoordinationPage: React.FC = () => {
  const { id } = useParams();
  const [tab, setTab] = useState('once');

  return (
    <MobileLayout>
      <PageHeader title="시간 조율하기" showBack />

      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} className="mx-4 mt-2" />

      {tab === 'once' ? (
        <CoordinationOneTime groupId={id} />
      ) : (
        <CoordinationRepeat groupId={id} />
      )}

    </MobileLayout>
  );
};

export default TimeCoordinationPage;
