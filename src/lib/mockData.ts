import type { PeerSpaceData } from "../types";

const currentUserId = "user-current";

export const peerSpaceData: PeerSpaceData = {
  currentUser: {
    id: currentUserId,
    name: "Mira Nandakumar",
    major: "Computer Science",
    year: "Junior",
    college: "Northview College",
    initials: "MN",
    rating: 4.8,
    sessionCount: 18,
    availability: "Tue and Thu evenings",
    bio: "Building strong systems fundamentals and looking for focused peers who like whiteboards, short sessions, and useful notes.",
    goals: ["Ship a capstone prototype", "Get better at technical interviews"],
    skills: [
      { id: "sk-react", name: "React", type: "knows" },
      { id: "sk-node", name: "Node.js", type: "knows" },
      { id: "sk-sql", name: "SQL", type: "knows" },
      { id: "sk-ml", name: "Machine Learning", type: "wants" },
      { id: "sk-design", name: "Product Design", type: "wants" }
    ]
  },
  peers: [
    {
      id: "user-aanya",
      name: "Aanya Rao",
      major: "Data Science",
      year: "Senior",
      college: "Northview College",
      initials: "AR",
      rating: 4.9,
      sessionCount: 31,
      availability: "Weekday mornings",
      bio: "Helps classmates turn vague data questions into clean notebooks, useful charts, and repeatable analysis.",
      goals: ["Find a frontend partner", "Practice model evaluation"],
      skills: [
        { id: "sk-python", name: "Python", type: "knows" },
        { id: "sk-ml", name: "Machine Learning", type: "knows" },
        { id: "sk-stats", name: "Statistics", type: "knows" },
        { id: "sk-react", name: "React", type: "wants" }
      ]
    },
    {
      id: "user-kabir",
      name: "Kabir Menon",
      major: "Electrical Engineering",
      year: "Sophomore",
      college: "Northview College",
      initials: "KM",
      rating: 4.7,
      sessionCount: 14,
      availability: "Friday lab block",
      bio: "Comfortable with circuits, embedded code, and explaining hard concepts without making people feel behind.",
      goals: ["Build an IoT study group", "Learn backend APIs"],
      skills: [
        { id: "sk-circuits", name: "Circuits", type: "knows" },
        { id: "sk-arduino", name: "Arduino", type: "knows" },
        { id: "sk-node", name: "Node.js", type: "wants" }
      ]
    },
    {
      id: "user-leah",
      name: "Leah Okafor",
      major: "Interaction Design",
      year: "Junior",
      college: "Northview College",
      initials: "LO",
      rating: 4.6,
      sessionCount: 22,
      availability: "Studio hours after 4",
      bio: "Turns early product ideas into clean flows, prototypes, and critique notes that teams can actually use.",
      goals: ["Join a social impact project", "Learn SQL basics"],
      skills: [
        { id: "sk-design", name: "Product Design", type: "knows" },
        { id: "sk-figma", name: "Figma", type: "knows" },
        { id: "sk-research", name: "User Research", type: "knows" },
        { id: "sk-sql", name: "SQL", type: "wants" }
      ]
    },
    {
      id: "user-dev",
      name: "Dev Iyer",
      major: "Mathematics",
      year: "Senior",
      college: "Northview College",
      initials: "DI",
      rating: 4.8,
      sessionCount: 27,
      availability: "Sunday afternoons",
      bio: "Patient tutor for proof writing, discrete math, and the kind of problem solving that shows up in CS theory.",
      goals: ["Review algorithms weekly", "Mentor first-years"],
      skills: [
        { id: "sk-algo", name: "Algorithms", type: "knows" },
        { id: "sk-discrete", name: "Discrete Math", type: "knows" },
        { id: "sk-python", name: "Python", type: "wants" }
      ]
    }
  ],
  activity: [
    {
      id: "act-1",
      title: "Leah posted a collab",
      detail: "Campus accessibility map needs React and GIS help.",
      timestamp: "12 min ago",
      kind: "collaboration"
    },
    {
      id: "act-2",
      title: "Aanya completed a session",
      detail: "Model validation walkthrough with two new reviews.",
      timestamp: "44 min ago",
      kind: "session"
    },
    {
      id: "act-3",
      title: "New member joined",
      detail: "Kabir added Arduino, circuits, and backend API goals.",
      timestamp: "1 hr ago",
      kind: "member"
    }
  ],
  collaborations: [
    {
      id: "collab-1",
      title: "Campus accessibility map",
      owner: "Leah Okafor",
      neededSkills: ["React", "GIS", "User Research"],
      status: "open",
      description: "Map quiet entrances, ramps, and elevator reliability for student services.",
      applicants: 6,
      meetingWindow: "Wednesdays after studio"
    },
    {
      id: "collab-2",
      title: "Dorm energy monitor",
      owner: "Kabir Menon",
      neededSkills: ["Arduino", "Node.js", "Charts"],
      status: "reviewing",
      description: "Prototype a low-cost energy dashboard for residence hall common rooms.",
      applicants: 4,
      meetingWindow: "Friday lab block"
    },
    {
      id: "collab-3",
      title: "Interview prep commons",
      owner: "Mira Nandakumar",
      neededSkills: ["Algorithms", "React", "Content"],
      status: "open",
      description: "A searchable bank of peer-written explanations for common technical questions.",
      applicants: 9,
      meetingWindow: "Sunday afternoons"
    }
  ],
  conversations: [],
  sessions: [],
  reviews: [
    {
      id: "review-1",
      reviewer: "Aanya Rao",
      rating: 5,
      topic: "SQL joins",
      body: "Mira explained joins with practical examples and left a clean set of notes."
    },
    {
      id: "review-2",
      reviewer: "Dev Iyer",
      rating: 5,
      topic: "Dynamic programming",
      body: "Focused, calm, and clear. The session had a plan and stuck to it."
    }
  ],
  notifications: [
    {
      id: "note-1",
      kind: "message",
      title: "New message from Leah",
      body: "Can you review the React route structure tonight?",
      read: false,
      createdAt: "7 min ago"
    },
    {
      id: "note-2",
      kind: "session",
      title: "Session request pending",
      body: "Dev asked for an algorithms review on Sunday.",
      read: false,
      createdAt: "25 min ago"
    },
    {
      id: "note-3",
      kind: "profile_view",
      title: "Profile viewed",
      body: "Three students found you through React search.",
      read: true,
      createdAt: "2 hr ago"
    }
  ]
};

peerSpaceData.conversations = [
  {
    id: "conv-leah",
    peer: peerSpaceData.peers[2],
    lastMessage: "Can you review the React route structure tonight?",
    unread: 1,
    messages: [
      {
        id: "msg-1",
        senderId: "user-leah",
        body: "The accessibility map has the first five locations ready.",
        sentAt: "4:12 PM"
      },
      {
        id: "msg-2",
        senderId: currentUserId,
        body: "Great. Send the Figma flow and I can wire the route shell.",
        sentAt: "4:16 PM"
      },
      {
        id: "msg-3",
        senderId: "user-leah",
        body: "Can you review the React route structure tonight?",
        sentAt: "4:24 PM"
      }
    ]
  },
  {
    id: "conv-dev",
    peer: peerSpaceData.peers[3],
    lastMessage: "Sunday still works for DP review.",
    unread: 0,
    messages: [
      {
        id: "msg-4",
        senderId: "user-dev",
        body: "Sunday still works for DP review.",
        sentAt: "11:08 AM"
      }
    ]
  }
];

peerSpaceData.sessions = [
  {
    id: "session-1",
    peer: peerSpaceData.peers[3],
    topic: "Dynamic programming review",
    scheduledFor: "Sun, Sep 13 at 3:00 PM",
    status: "confirmed",
    notes: "Bring two medium problems and a recurrence sketch."
  },
  {
    id: "session-2",
    peer: peerSpaceData.peers[0],
    topic: "Model evaluation",
    scheduledFor: "Tue, Sep 8 at 10:30 AM",
    status: "requested",
    notes: "Compare precision, recall, and confusion matrices."
  },
  {
    id: "session-3",
    peer: peerSpaceData.peers[2],
    topic: "Prototype critique",
    scheduledFor: "Fri, Sep 4 at 4:00 PM",
    status: "completed",
    notes: "Review left. Follow-up prototype scheduled."
  }
];
