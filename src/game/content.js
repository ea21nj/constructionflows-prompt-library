// The site and its crew. One crew member per agent; agentId matches agents[].id in index.html.
// World units are metres, y up. Rects are [minX, maxX, minZ, maxZ].
// Question copy is drafted for owner review: answers run from "this is fine" (0) to "this hurts" (3).

export const AREAS = [
  { id: 'office', label: 'Site office', rect: [-61.5, -24, 16.5, 34.5] },
  { id: 'building', label: 'Main building', rect: [-60, -10.5, -33, -3] },
  { id: 'excavation', label: 'Excavation', rect: [6, 49.5, -33, -4.5] },
  { id: 'laydown', label: 'Laydown yard', rect: [48, 63, 7.5, 33] },
  { id: 'parking', label: 'Parking + food truck', rect: [12, 42, 16.5, 34.5] },
];

export const OFFICE = {
  footprint: [-57, -37.75, 22.65, 30.75],   // office stack + annex (see layout.js)
  door: [-37.5, 27],
  trigger: [-37.5, -34, 25, 29],
};

export const SPAWN = [-1.5, 36];

export const CREW = [
  {
    agentId: 1, name: 'Maria', role: 'Bid Desk', area: 'office', activity: 'plans',
    spot: [-30, 20.5], route: [[-30, 20.5], [-27.5, 19], [-30, 18]],
    questions: [
      { q: 'How do bid invites reach you today?', answers: ['One clean inbox or portal', 'A couple of portals plus email', 'Scattered across inboxes and texts', 'Honestly, some just get missed'] },
      { q: 'How often does an addendum or due date slip past you?', answers: ['Never', 'Once in a blue moon', 'A few times a year', 'Often enough that it costs us work'] },
      { q: 'When you decide to bid, how fast do vendor quote requests go out?', answers: ['Same day, from a template', 'Within a couple of days', 'Whenever someone gets to it', 'Usually too late to matter'] },
    ],
  },
  {
    agentId: 8, name: 'Priya', role: 'AIA Billing / Pay Apps', area: 'parking', activity: 'chat',
    spot: [31, 22], route: [[31, 22], [34, 20], [36, 23]],
    questions: [
      { q: 'How long does it take to put a pay app together?', answers: ['An hour or two', 'Most of a day', 'Several days of chasing', 'It takes over the whole week'] },
      { q: 'How do you get percent complete from the PMs?', answers: ['A clean report every month', 'A quick email back and forth', 'I chase them until I get it', 'I end up estimating it myself'] },
      { q: 'Do approved change orders ever miss the billing cycle?', answers: ['Never', 'Rarely', 'It has happened', 'Regularly — money left on the table'] },
    ],
  },
  {
    agentId: 9, name: 'Kim', role: 'Safety / Compliance', area: 'excavation', activity: 'board',
    spot: [47, -23.5], route: [[47, -23.5], [48.5, -21.5], [45, -24.5]],
    questions: [
      { q: 'How do toolbox talks happen on your jobs?', answers: ['Every week, signed and filed', 'Most weeks', 'When someone remembers', 'Mostly after something goes wrong'] },
      { q: 'Where do JHAs, certs and insurance docs live?', answers: ['One organised system', 'A shared drive, mostly current', 'Truck dashboards and inboxes', 'Nobody is quite sure'] },
      { q: 'If an auditor walked on tomorrow, how would it go?', answers: ['Easy — binder is ready', 'Fine after a few hours of prep', 'A real scramble', 'We would not pass'] },
    ],
  },
  {
    agentId: 3, name: 'Dave', role: 'PM Second Brain', area: 'building', activity: 'clipboard',
    spot: [-44, -17], route: [[-44, -17], [-40, -17], [-40, -19.5], [-44, -19.5]],
    questions: [
      { q: 'How many projects are you juggling right now?', answers: ['One or two', 'Three to five', 'Six to ten', 'More than I can keep in my head'] },
      { q: 'Where do your meeting notes and action items end up?', answers: ['A shared tracker everyone uses', 'A notebook I keep up to date', 'Emails to myself', 'Mostly nowhere'] },
      { q: 'How much of your week goes to status updates and admin?', answers: ['A couple of hours', 'About a day', 'Two days or more', 'Most of it'] },
    ],
  },
  {
    agentId: 4, name: 'Jess', role: 'RFI / Submittal', area: 'building', activity: 'drawings',
    spot: [-25, -9], route: [[-25, -9], [-20, -9], [-22, -12]],
    questions: [
      { q: 'How do you pull submittal requirements out of the specs?', answers: ['A checklist we reuse', 'Read the sections carefully each time', 'Skim and hope', 'We find out when something is rejected'] },
      { q: 'How are RFIs written today?', answers: ['From a solid template', 'Copy an old one and edit', 'From scratch every time', 'They often do not get written'] },
      { q: 'Do you know which submittals are waiting on approval right now?', answers: ['Yes, the log is live', 'Roughly, from memory', 'Only if I dig through email', 'No idea'] },
    ],
  },
  {
    agentId: 6, name: 'Sam', role: 'Change Order / Margin Protection', area: 'building', activity: 'photo',
    spot: [-18, -27], route: [[-18, -27], [-12.5, -26], [-12.5, -18]],
    questions: [
      { q: 'When extra work comes up on site, how is it captured?', answers: ['Written up and priced right away', 'Noted and passed to the PM', 'Remembered at billing time', 'It often is not'] },
      { q: 'Does work ever start before the change is approved in writing?', answers: ['Never', 'Rarely', 'Fairly often', 'All the time'] },
      { q: 'How much margin do you think slips through unbilled changes?', answers: ['Almost none', 'A little', 'More than we would like', 'A lot'] },
    ],
  },
  {
    agentId: 5, name: 'Luis', role: 'Field-to-Office Evidence', area: 'excavation', activity: 'log',
    spot: [22, -14], route: [[22, -14], [28, -12], [30, -16], [24, -18]],
    questions: [
      { q: 'How do your daily reports get to the office?', answers: ['An app, filled in daily', 'Email at the end of the day', 'Texts and photos when I can', 'They usually do not'] },
      { q: 'Where do your job photos live?', answers: ['Filed by project and date', 'A shared folder, roughly', 'On my phone', 'Spread across everyone’s phones'] },
      { q: 'Could you pull backup for disputed work in ten minutes?', answers: ['Yes', 'Within an hour', 'It would take days', 'Probably not at all'] },
    ],
  },
  {
    agentId: 7, name: 'Andre', role: 'Vendor / Subcontractor CRM', area: 'laydown', activity: 'delivery',
    spot: [55, 22], route: [[55, 22], [58, 26], [55, 29], [52, 25]],
    questions: [
      { q: 'How current is your vendor and sub list?', answers: ['Up to date in one place', 'Mostly current', 'Old spreadsheets and phone contacts', 'It lives in a few people’s heads'] },
      { q: 'How do you track sub insurance, W-9s and licences?', answers: ['Automatic reminders', 'A spreadsheet we check', 'Someone checks when they remember', 'We find out when it has lapsed'] },
      { q: 'Do you know which subs and suppliers actually respond fast?', answers: ['Yes, we track it', 'We have a good feel for it', 'Only the PMs who used them know', 'Not really'] },
    ],
  },
  {
    agentId: 2, name: 'Rosa', role: 'Lead / Sales Follow-Up', area: 'office', activity: 'laptop',
    spot: [-35.5, 31.8], route: [[-35.5, 31.8], [-35, 33.8], [-36.5, 33.2]],
    questions: [
      { q: 'Where do your customer and GC contacts live?', answers: ['A CRM we actually use', 'One shared spreadsheet', 'Email, phones and business cards', 'In the owner’s head'] },
      { q: 'After you send an estimate, what happens next?', answers: ['Follow-up on a schedule', 'A call when we remember', 'We wait to hear back', 'Usually nothing'] },
      { q: 'Do you know which GCs send you the best work?', answers: ['Yes, we track win rates', 'We have a good idea', 'Just a gut feel', 'No idea'] },
    ],
  },
  {
    agentId: 10, name: 'Tom', role: 'Company Knowledge / Archiver', area: 'parking', activity: 'sit',
    spot: [21, 31.2], route: [[21, 31.2], [21.05, 31.2]],
    questions: [
      { q: 'When a new hire has a question, where do they go?', answers: ['A shared playbook', 'Templates in a shared drive', 'Whoever is around', 'Straight to the owner, every time'] },
      { q: 'How are lessons learned captured after a job?', answers: ['Written up at closeout', 'Talked about, sometimes noted', 'Talked about, never written', 'They are not'] },
      { q: 'If your most senior person left tomorrow, how much would walk out with them?', answers: ['Very little', 'Some', 'A lot', 'Most of how we work'] },
    ],
  },
];
