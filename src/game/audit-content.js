// The site audit: 7 sections × 5 questions, asked at checkpoints around the site. Copy supplied by
// the owner (2026-10-26), used verbatim. Answers run A (strongest) to D (weakest).
// Checkpoint spots are in world metres, on free ground away from the crew.

export const AUDIT_SECTIONS = [
  {
    id: 'bidding', title: 'Bidding & Pipeline', spot: [-50, 19], where: 'Site office compound',
    questions: [
      { dim: 'Visibility', q: 'How easily can your team see the current status of every active bid?', answers: ['In one centralized system with real-time status, owner, and due dates', 'In structured spreadsheets that are regularly updated', 'By checking multiple tools, emails, or individual notes', 'There is no reliable way to see all active bids in one view'] },
      { dim: 'Process', q: 'When a bid needs follow-up, what usually triggers the next action?', answers: ['A defined workflow with reminders, deadlines, and ownership', 'A team member updates it manually in a structured process', 'Someone remembers to follow up based on experience or habit', 'Follow-up happens inconsistently or only when someone asks'] },
      { dim: 'Failure Mode', q: 'How are stalled or inactive bids usually identified?', answers: ['The system flags inactivity automatically', 'They are identified during regular pipeline reviews', 'They are usually noticed later when someone checks back in', 'They often go unnoticed until the opportunity is already cold or lost'] },
      { dim: 'Accountability', q: 'How is ownership of each bid defined?', answers: ['One person is clearly assigned and visible for every bid', 'Ownership is assigned, but not always visible in one place', 'Multiple people are involved, but ownership is not always clear', 'Ownership is unclear or changes without structure'] },
      { dim: 'Cost / Cash', q: 'What is the typical cost of inefficiency in your bidding process?', answers: ['Minimal, with little rework or missed follow-up', 'Some lost time, but generally manageable', 'Noticeable time loss, duplicated effort, or delayed response', 'Significant inefficiency that affects hit rate, labor, or revenue'] },
    ],
  },
  {
    id: 'kickoff', title: 'Project Kickoff', spot: [14.5, 36.5], where: 'By the gate',
    questions: [
      { dim: 'Process', q: 'How standardized is your project kickoff process?', answers: ['Every project follows the same documented kickoff workflow', 'A kickoff process exists, but it is not followed consistently', 'The process is mostly informal and varies by PM', 'There is no defined kickoff process'] },
      { dim: 'People Dependency', q: 'If the primary PM became unavailable right after award, what would happen?', answers: ['Another team member could take over with minimal disruption', 'There would be some delay, but the handoff would be manageable', 'Important information would need to be reconstructed or re-explained', 'The project start would stall because too much depends on that person'] },
      { dim: 'Failure Mode', q: 'When project starts go poorly, what is usually the root cause?', answers: ['Issues are rare because startup gaps are usually caught early', 'Minor coordination or setup items are occasionally missed', 'Required information, access, or responsibilities are often incomplete', 'There is no consistent startup structure, so early confusion is common'] },
      { dim: 'Accountability', q: 'How clearly is ownership defined during kickoff?', answers: ['Each kickoff step has a clearly assigned owner', 'Ownership is generally understood, even if not always documented', 'Ownership is shared across people, which creates some ambiguity', 'Ownership is often unclear at the start of the job'] },
      { dim: 'Cost / Cash', q: 'What is the downstream impact when kickoff is weak or inconsistent?', answers: ['Minimal impact because issues are corrected early', 'Some inefficiency, but it stays contained', 'It creates rework, delays, or extra coordination later', 'It creates significant schedule, labor, or cost impact downstream'] },
    ],
  },
  {
    id: 'scheduling', title: 'Scheduling', spot: [-13, -1], where: 'Schedule board by the building',
    questions: [
      { dim: 'Process', q: 'How is the working project schedule managed day to day?', answers: ['In one centralized system that serves as the current schedule', 'In a structured format that is updated regularly', 'Through shared files, messages, or manual coordination', 'Through multiple versions with no clear source of truth'] },
      { dim: 'Visibility', q: 'When the schedule changes, how visible is that update to the people affected?', answers: ['The update is visible immediately to everyone who needs it', 'The update is communicated through a standard process', 'The update is shared manually and may not reach everyone quickly', 'Visibility is inconsistent, and people may continue using old information'] },
      { dim: 'Failure Mode', q: 'How often do people end up working from an outdated schedule?', answers: ['Rarely or never, because outdated versions are controlled', 'Occasionally, but the issue is caught quickly', 'It happens often enough to create confusion or rework', 'It happens regularly and causes recurring coordination problems'] },
      { dim: 'Accountability', q: 'How clear is ownership of the live project schedule?', answers: ['One person clearly owns the current schedule', 'Ownership is generally understood, even if not formalized', 'Multiple people update or manage it, which creates some ambiguity', 'No one clearly owns the current schedule'] },
      { dim: 'Cost / Cash', q: 'What is the typical impact when teams are misaligned on schedule?', answers: ['Minimal, with little or no downstream effect', 'Some lost efficiency, but manageable', 'Rework, lost labor time, or delayed execution', 'Significant schedule disruption or avoidable cost impact'] },
    ],
  },
  {
    id: 'rfis', title: 'RFIs & Submittals', spot: [-31, -18], where: 'Inside the main building',
    questions: [
      { dim: 'Process', q: 'How are RFIs and submittals managed from start to close?', answers: ['In one structured workflow with status, ownership, and due dates', 'In a mostly structured process with some manual gaps', 'Across multiple tools, emails, or trackers', 'Without a consistent process or tracking method'] },
      { dim: 'Accountability', q: 'How clearly is ownership defined for each RFI or submittal?', answers: ['A current owner is clearly assigned at every stage', 'Ownership is assigned, but not always easy to confirm', 'Ownership shifts informally based on who is involved', 'Ownership is often unclear or assumed'] },
      { dim: 'Failure Mode', q: 'When RFIs or submittals are delayed, where do they usually break down?', answers: ['Delays are rare because issues are surfaced early', 'Delays happen occasionally at handoffs or approvals', 'Delays happen regularly because follow-up or visibility is inconsistent', 'Delays are common and usually discovered after they affect the job'] },
      { dim: 'Visibility', q: 'How easily can you see the current status of an RFI or submittal?', answers: ['Instantly, in one place with linked documents and status', 'Mostly visible, with occasional manual checking', 'Visible, but only after searching across tools or emails', 'Difficult to determine without asking around'] },
      { dim: 'Cost / Cash', q: 'What is the usual project impact of delayed RFIs or submittals?', answers: ['Minimal, because delays are rare or quickly resolved', 'Some pressure, but generally manageable', 'Noticeable schedule or coordination impact', 'Significant delay, rework, or cost impact on the project'] },
    ],
  },
  {
    id: 'visibility', title: 'Project Visibility', spot: [2, -9], where: 'By the tower crane',
    questions: [
      { dim: 'Visibility', q: 'How easily can leadership see current project health across active jobs?', answers: ['Through real-time dashboards with current status and risk visibility', 'Through regular reports that provide a solid picture', 'Through updates gathered from meetings, emails, or individual check-ins', 'Visibility is limited and often based on perception rather than current data'] },
      { dim: 'Process', q: 'How are project risks identified before they become bigger issues?', answers: ['Through a defined process with regular tracking and escalation', 'Through structured reviews or recurring check-ins', 'As part of normal conversation when something starts to feel off', 'Mostly after the impact is already visible'] },
      { dim: 'Failure Mode', q: 'When project issues surface, how early are they typically identified?', answers: ['Early enough to act before material impact', 'After a slight delay, but still internally identified', 'Late, once the issue has started affecting execution', 'After impact, often through escalation or outside pressure'] },
      { dim: 'Accountability', q: 'How clear is ownership for identifying and escalating project risk?', answers: ['Risk ownership is clearly defined and consistently followed', 'Ownership is generally understood, even if not always formalized', 'Risk ownership is shared, so escalation can be inconsistent', 'It is often unclear who is responsible for surfacing risk'] },
      { dim: 'Cost / Cash', q: 'What is the usual impact of identifying project issues late?', answers: ['Minimal, because most issues are contained quickly', 'Some extra coordination or delay, but manageable', 'Noticeable schedule pressure, labor inefficiency, or missed decisions', 'Significant cost, delay, or margin impact'] },
    ],
  },
  {
    id: 'field', title: 'Field Execution', spot: [35, -7], where: 'At the excavation',
    questions: [
      { dim: 'Process', q: 'How are daily field assignments communicated and confirmed?', answers: ['Through a structured process tied to the current plan or schedule', 'Through a consistent routine led by field leadership', 'Through informal conversations, texts, or day-of coordination', 'Ad hoc, with no consistent process'] },
      { dim: 'People Dependency', q: 'How dependent is field execution on specific individuals to keep work moving?', answers: ['Low dependency because direction is documented and repeatable', 'Some dependency, but others can step in when needed', 'High dependency on key individuals for coordination and clarity', 'Critical dependency, where work breaks down without specific people'] },
      { dim: 'Failure Mode', q: 'When field confusion happens, how often does it affect execution?', answers: ['Rarely, because priorities are usually clear', 'Occasionally, but it is resolved quickly', 'Frequently enough to cause lost time or misalignment', 'Constantly enough to disrupt daily production'] },
      { dim: 'Accountability', q: 'How clear is ownership for setting and communicating daily field priorities?', answers: ['Clearly assigned to a specific role every day', 'Generally known, even if not always documented', 'Shared across people, which can create inconsistency', 'Often unclear who owns daily direction'] },
      { dim: 'Cost / Cash', q: 'How much labor time is typically lost due to unclear or shifting daily direction?', answers: ['Very little', 'Some, but not enough to materially affect productivity', 'Noticeable lost time across crews or throughout the week', 'Significant lost labor time that regularly affects production'] },
    ],
  },
  {
    id: 'closeout', title: 'Closeout', spot: [17, 25.5], where: 'By the parking lot',
    questions: [
      { dim: 'Process', q: 'How structured is your closeout process from punch to final completion?', answers: ['Fully structured with clear steps, requirements, and tracking', 'Mostly structured, with a few manual gaps', 'Managed manually through coordination and follow-up', 'Largely reactive, with steps handled as issues arise'] },
      { dim: 'Accountability', q: 'How clearly is ownership defined for closeout deliverables?', answers: ['Each item has a clear owner and due date', 'Ownership is generally understood, even if not always tracked', 'Ownership is shared, which creates some ambiguity', 'Ownership is often unclear until something is overdue'] },
      { dim: 'Failure Mode', q: 'When closeout gets delayed, what is usually true?', answers: ['Delays are uncommon because issues are identified early', 'A few minor items remain open, but are manageable', 'Documentation, approvals, or follow-up regularly hold things up', 'Closeout delays are common and typically discovered late'] },
      { dim: 'Visibility', q: 'How easily can your team see closeout status across active jobs?', answers: ['Fully visible in one place with current progress by item', 'Mostly visible, with some manual follow-up needed', 'Limited visibility that requires asking around or checking files', 'No reliable view of closeout progress across jobs'] },
      { dim: 'Cost / Cash', q: 'How predictable is final payment timing once the work is complete?', answers: ['Highly predictable and closely aligned with completion', 'Slightly delayed, but generally manageable', 'Regularly delayed due to missing items or loose closeout', 'Frequently delayed in a way that affects cash flow'] },
    ],
  },
];
