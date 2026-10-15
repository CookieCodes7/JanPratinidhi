export type Representative = {
  id: string;
  name: string;
  role: 'Lok Sabha' | 'Rajya Sabha';
  constituency: string;
  state: string;
  party: string;
  partyShort: string;
  term: string;
  initials: string;
  color: string;
  attendance: number;
  questions: number;
  debates: number;
  bills: number;
  pai: number;
  updated: string;
  committees: string[];
};

export const representatives: Representative[] = [
  { id: 'r1', name: 'Meera Kulkarni', role: 'Lok Sabha', constituency: 'Pune', state: 'Maharashtra', party: 'Indian National Congress', partyShort: 'INC', term: '18th Lok Sabha', initials: 'MK', color: '#b65b38', attendance: 91, questions: 74, debates: 31, bills: 8, pai: 78, updated: '18 Jun 2024', committees: ['Standing Committee on Finance', 'Consultative Committee: Railways'] },
  { id: 'r2', name: 'Arjun Pratap Singh', role: 'Lok Sabha', constituency: 'Lucknow', state: 'Uttar Pradesh', party: 'Bharatiya Janata Party', partyShort: 'BJP', term: '18th Lok Sabha', initials: 'AS', color: '#2e7180', attendance: 86, questions: 53, debates: 42, bills: 6, pai: 74, updated: '18 Jun 2024', committees: ['Standing Committee on Home Affairs'] },
  { id: 'r3', name: 'Nandita Rao', role: 'Rajya Sabha', constituency: 'Karnataka', state: 'Karnataka', party: 'Janata Dal (Secular)', partyShort: 'JD(S)', term: 'Rajya Sabha 2022–28', initials: 'NR', color: '#82703d', attendance: 94, questions: 81, debates: 27, bills: 10, pai: 82, updated: '18 Jun 2024', committees: ['Standing Committee on Education', 'Business Advisory Committee'] },
  { id: 'r4', name: 'Devendra Choudhary', role: 'Lok Sabha', constituency: 'Jaipur Rural', state: 'Rajasthan', party: 'Bharatiya Janata Party', partyShort: 'BJP', term: '18th Lok Sabha', initials: 'DC', color: '#6d5b83', attendance: 79, questions: 46, debates: 28, bills: 5, pai: 68, updated: '17 Jun 2024', committees: ['Standing Committee on Rural Development'] },
  { id: 'r5', name: 'S. Venkatesan', role: 'Lok Sabha', constituency: 'Madurai', state: 'Tamil Nadu', party: 'Communist Party of India (Marxist)', partyShort: 'CPI(M)', term: '18th Lok Sabha', initials: 'SV', color: '#a34d4d', attendance: 88, questions: 96, debates: 38, bills: 7, pai: 85, updated: '18 Jun 2024', committees: ['Standing Committee on Labour', 'Library Committee'] },
  { id: 'r6', name: 'Farah Naqvi', role: 'Lok Sabha', constituency: 'Srinagar', state: 'Jammu & Kashmir', party: 'Jammu & Kashmir National Conference', partyShort: 'JKNC', term: '18th Lok Sabha', initials: 'FN', color: '#3d7b69', attendance: 83, questions: 62, debates: 35, bills: 4, pai: 76, updated: '16 Jun 2024', committees: ['Standing Committee on Defence'] },
  { id: 'r7', name: 'Ritwik Das', role: 'Lok Sabha', constituency: 'Kolkata North', state: 'West Bengal', party: 'All India Trinamool Congress', partyShort: 'AITC', term: '18th Lok Sabha', initials: 'RD', color: '#4e6791', attendance: 90, questions: 58, debates: 46, bills: 9, pai: 81, updated: '18 Jun 2024', committees: ['Standing Committee on Communications'] },
  { id: 'r8', name: 'Lalhmingliana Sailo', role: 'Rajya Sabha', constituency: 'Mizoram', state: 'Mizoram', party: 'Mizo National Front', partyShort: 'MNF', term: 'Rajya Sabha 2020–26', initials: 'LS', color: '#887052', attendance: 87, questions: 39, debates: 22, bills: 3, pai: 64, updated: '15 Jun 2024', committees: ['Standing Committee on Tribal Affairs'] },
];

export const sessions = [
  { name: 'Budget Session 2024', meta: '31 Jan – 10 May 2024', sitting: '24 sittings', attendance: 86, tone: 'current' },
  { name: 'Monsoon Session 2023', meta: '20 Jul – 11 Aug 2023', sitting: '17 sittings', attendance: 82, tone: 'past' },
  { name: 'Winter Session 2022', meta: '7 – 23 Dec 2022', sitting: '13 sittings', attendance: 78, tone: 'past' },
];

export const attendanceTrend = [
  { session: 'Winter 22', attendance: 78, questions: 312, participation: 54 },
  { session: 'Budget 23', attendance: 84, questions: 428, participation: 61 },
  { session: 'Monsoon 23', attendance: 82, questions: 284, participation: 59 },
  { session: 'Winter 23', attendance: 80, questions: 367, participation: 64 },
  { session: 'Budget 24', attendance: 86, questions: 491, participation: 72 },
];

export const questions = [
  { id: 'q1', number: 'Q. 143', title: 'Availability of safe drinking water in peri-urban wards', rep: 'Meera Kulkarni', constituency: 'Pune', ministry: 'Ministry of Jal Shakti', date: '12 Feb 2024', status: 'Answered', type: 'Starred', summary: 'Asked for ward-level coverage figures, testing cadence and the timeline for expanding piped supply to 38 peri-urban settlements.' },
  { id: 'q2', number: 'Q. 278', title: 'Railway station accessibility upgrades', rep: 'Meera Kulkarni', constituency: 'Pune', ministry: 'Ministry of Railways', date: '28 Feb 2024', status: 'Answered', type: 'Unstarred', summary: 'Requested a status report on lifts, tactile paths and accessible toilets at Pune division stations.' },
  { id: 'q3', number: 'Q. 417', title: 'Teacher vacancies in government schools', rep: 'Nandita Rao', constituency: 'Karnataka', ministry: 'Ministry of Education', date: '5 Mar 2024', status: 'Answered', type: 'Starred', summary: 'Sought state-wise vacancy and recruitment data, with a focus on rural and aspirational districts.' },
  { id: 'q4', number: 'Q. 588', title: 'Coastal erosion mitigation programme', rep: 'S. Venkatesan', constituency: 'Madurai', ministry: 'Ministry of Environment', date: '18 Mar 2024', status: 'Pending', type: 'Unstarred', summary: 'Asked whether the national programme includes community monitoring and transparent project-level reporting.' },
  { id: 'q5', number: 'Q. 701', title: 'Mobile connectivity along the Srinagar–Leh corridor', rep: 'Farah Naqvi', constituency: 'Srinagar', ministry: 'Ministry of Communications', date: '2 Apr 2024', status: 'Answered', type: 'Starred', summary: 'Asked for tower commissioning dates and service resilience planning for remote blocks.' },
  { id: 'q6', number: 'Q. 812', title: 'Urban flood resilience funds', rep: 'Ritwik Das', constituency: 'Kolkata North', ministry: 'Ministry of Housing & Urban Affairs', date: '17 Apr 2024', status: 'Answered', type: 'Unstarred', summary: 'Requested details of city-level allocations and the monitoring framework for storm-water works.' },
];

export const issues = [
  { id: 'i1', title: 'Shivajinagar bus interchange', location: 'Pune, Maharashtra', category: 'Transport', status: 'In progress', updated: '4 days ago', source: 'PMC budget 2024–25', note: 'Construction tender awarded; pedestrian access design under review.', color: '#2e7180' },
  { id: 'i2', title: 'Khadakwasla water network', location: 'Pune, Maharashtra', category: 'Water', status: 'Proposed', updated: '12 days ago', source: 'Jal Jeevan Mission dashboard', note: 'Detailed project report listed for the next planning cycle.', color: '#4e6791' },
  { id: 'i3', title: 'Primary health centre staffing', location: 'Haveli, Maharashtra', category: 'Health', status: 'Monitoring', updated: '2 weeks ago', source: 'District health bulletin', note: 'Vacancy position published; no attribution inferred from this record.', color: '#a34d4d' },
  { id: 'i4', title: 'Mula-Mutha floodplain restoration', location: 'Pune, Maharashtra', category: 'Environment', status: 'In progress', updated: '3 weeks ago', source: 'NMCG release', note: 'Segment-wise work package is in procurement stage.', color: '#3d7b69' },
  { id: 'i5', title: 'Digital classrooms in rural blocks', location: 'Mysuru, Karnataka', category: 'Education', status: 'Reported', updated: '1 month ago', source: 'Parliament question Q. 417', note: 'Reported in a parliamentary reply; implementation records remain separate.', color: '#82703d' },
];

export const projects = [
  { name: 'Pune station accessibility package', district: 'Pune', ministry: 'Railways', stage: 'Tender awarded', amount: '₹42.6 cr', updated: 'Jun 2024', source: 'Railway budget documents' },
  { name: 'Karnataka school digital access', district: 'Mysuru', ministry: 'Education', stage: 'Implementation', amount: '₹18.4 cr', updated: 'May 2024', source: 'Samagra Shiksha portal' },
  { name: 'Madurai ring road survey', district: 'Madurai', ministry: 'Road Transport', stage: 'Feasibility study', amount: '₹6.8 cr', updated: 'Apr 2024', source: 'NHAI project brief' },
  { name: 'Srinagar district hospital wing', district: 'Srinagar', ministry: 'Health', stage: 'Sanctioned', amount: '₹71.2 cr', updated: 'Mar 2024', source: 'Health ministry release' },
];

export const sources = [
  { name: 'Lok Sabha Digital Sansad', type: 'Parliamentary record', coverage: 'Questions, debates, bills', accessed: '18 Jun 2024', status: 'Verified', url: 'sansad.in' },
  { name: 'Rajya Sabha records', type: 'Parliamentary record', coverage: 'Questions, debates, committees', accessed: '18 Jun 2024', status: 'Verified', url: 'rajyasabha.nic.in' },
  { name: 'Election Commission of India', type: 'Public register', coverage: 'Constituencies, member details', accessed: '12 Jun 2024', status: 'Verified', url: 'eci.gov.in' },
  { name: 'Open Government Data Platform', type: 'Government dataset', coverage: 'Schemes, districts, indicators', accessed: '10 Jun 2024', status: 'Reviewed', url: 'data.gov.in' },
  { name: 'Municipal & district releases', type: 'Local record', coverage: 'Projects and implementation', accessed: 'Varies', status: 'Needs review', url: 'Local repositories' },
];

export const feedback = [
  { id: 'f1', topic: 'Water supply', constituency: 'Pune', message: 'Please add the latest ward-wise tanker data to the issue timeline.', date: '14 Jun 2024', status: 'New' },
  { id: 'f2', topic: 'Source correction', constituency: 'Madurai', message: 'The linked district bulletin has moved to a new archive location.', date: '12 Jun 2024', status: 'Under review' },
  { id: 'f3', topic: 'Accessibility', constituency: 'Kolkata North', message: 'The table view is useful; a Bengali-language source label would help.', date: '08 Jun 2024', status: 'Noted' },
];

export const auditEntries = [
  { time: '18 Jun 2024 · 16:32', actor: 'Data steward · Kavita N.', action: 'Updated source review status', target: 'Municipal & district releases', detail: 'Marked needs review after a broken archive link report.' },
  { time: '18 Jun 2024 · 14:10', actor: 'System import', action: 'Imported parliamentary questions', target: 'Budget Session 2024', detail: '491 records matched to member IDs.' },
  { time: '17 Jun 2024 · 11:48', actor: 'Data steward · Rahul P.', action: 'Corrected constituency label', target: 'Srinagar', detail: 'Standardised district spelling against ECI register.' },
  { time: '14 Jun 2024 · 09:20', actor: 'System import', action: 'Refreshed project statuses', target: 'Development tracker', detail: '18 project records received from public government documents.' },
];