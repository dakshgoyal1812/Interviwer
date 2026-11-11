import { DifficultyLevel, InterviewMode, MoodTag, GestureTag } from '../utils/interviewRules';

export interface InterviewerPersona {
  id: string;
  name: string;
  roleTitle: string;
  personalityType: 'Friendly HR' | 'Strict Technical' | 'Professional Corporate';
  voiceName: string;       // Gemini TTS voice ('Kore' | 'Fenrir' | 'Zephyr' | 'Charon' | 'Puck')
  edgeTtsVoice: string;    // msedge-tts voice ('en-US-AriaNeural' | 'en-US-GuyNeural' | 'en-GB-SoniaNeural')
  avatarAccentColor: string;
  avatarSuitColor: string;
  avatarHairColor: string;
  defaultMood: MoodTag;
  systemPrompt: string;
  description: string;
}

export interface QuestionBankItem {
  id: string;
  mode: InterviewMode;
  topic: string;
  difficulty: DifficultyLevel;
  questionText: string;
  idealKeyPoints: string[];
  followUpHints: string[];
}

export type SupportedCodeLanguage = 'python' | 'javascript' | 'cpp' | 'java' | 'c';

export interface CodingTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  topic: string;
  difficulty: DifficultyLevel;
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation: string }[];
  testCases: CodingTestCase[];
  // Ordered argument types for the sandbox test harness: 'int' | 'long' | 'double' | 'string' | 'int[]' | 'int[][]' | 'string[]'
  argTypes?: string[];
  optimalTimeComplexity: string;
  optimalSpaceComplexity: string;
  starterCode: Record<SupportedCodeLanguage, string>;
  referenceSolutionSummary: string;
}

export interface QABreakdownItem {
  id: string;
  questionNumber: number;
  topic: string;
  difficulty: DifficultyLevel;
  questionText: string;
  candidateAnswer: string;
  interviewerFeedback: string;
  score: number;
  technicalScore: number;
  wpm: number;
  fillerCount: number;
  durationSeconds: number;
  moodTag: MoodTag;
  gestureTag: GestureTag;
  strengths: string[];
  improvements: string[];
}

export interface InterviewReportRecord {
  id: string;
  sessionId: string;
  createdAt: string;
  mode: InterviewMode;
  subTopic: string;
  difficulty: DifficultyLevel;
  personaId: string;
  personaName: string;
  overallScore: number;
  categoryScores: {
    answerQuality: number;
    communication: number;
    technicalCorrectness: number;
    presentation: number;
  };
  voiceSummary: {
    avgWpm: number;
    totalFillers: number;
    fillerBreakdown: Record<string, number>;
    longPauses: number;
    totalDurationSeconds: number;
    speakingConsistency: number;
  };
  presentationSummary: {
    faceVisibilityPct: number;
    gazeAlignmentPct: number;
    postureStabilityPct: number;
    shoulderAlignmentPct: number;
    gentleObservations: string[];
  };
  codingSubmission?: {
    problemTitle: string;
    language: SupportedCodeLanguage;
    passedTests: number;
    totalTests: number;
    code: string;
    verbalApproachTranscript: string;
    complexityEvaluation: string;
    aiCodeScore: number;
  };
  strongestAnswerSummary: string;
  weakestAnswerSummary: string;
  actionableImprovements: string[];
  qaBreakdown: QABreakdownItem[];
}

export const INTERVIEWER_PERSONAS: InterviewerPersona[] = [
  {
    id: 'persona-waguri-hr',
    name: 'Waguri Aoi',
    roleTitle: 'Lead Talent & People Partner',
    personalityType: 'Friendly HR',
    voiceName: 'Kore',
    edgeTtsVoice: 'en-US-AriaNeural',
    avatarAccentColor: '#38bdf8',
    avatarSuitColor: '#1e293b',
    avatarHairColor: '#1e1b4b',
    defaultMood: 'encouraging',
    description:
      'Warm, supportive behavioral & career interviewer using the Waguri VRM pipeline. Probes STAR structure, ownership, conflict resolution, and growth mindset.',
    systemPrompt: `You are Waguri Aoi, a warm, perceptive Lead Talent & People Partner conducting a realistic behavioral/HR or project interview.
Ask ONE clear question at a time. Wait for the candidate's response, evaluate its depth, STAR structure (Situation, Task, Action, Result), and ownership, then ask a contextual follow-up or transition to the next topic.
Never repeat questions. Adjust difficulty dynamically. Return valid JSON matching the required turn schema.`,
  },
  {
    id: 'persona-kenji-tech',
    name: 'Kenji Sato',
    roleTitle: 'Principal Systems Architect',
    personalityType: 'Strict Technical',
    voiceName: 'Fenrir',
    edgeTtsVoice: 'en-US-GuyNeural',
    avatarAccentColor: '#818cf8',
    avatarSuitColor: '#0f172a',
    avatarHairColor: '#090d16',
    defaultMood: 'serious',
    description:
      'Rigorous Principal Engineer focused on first-principles engineering, edge cases, memory/concurrency trade-offs, DBMS internals, OS scheduling, and algorithmic complexity.',
    systemPrompt: `You are Kenji Sato, a rigorous Principal Systems Architect conducting a technical or DSA interview.
Probe beneath surface definitions: ask about trade-offs, failure modes, concurrency, time/space complexity, and concrete engineering mechanisms.
Ask ONE question at a time. Evaluate correctness strictly and raise difficulty when the candidate answers well.`,
  },
  {
    id: 'persona-elena-corp',
    name: 'Elena Vance',
    roleTitle: 'VP of Engineering & Product Delivery',
    personalityType: 'Professional Corporate',
    voiceName: 'Zephyr',
    edgeTtsVoice: 'en-GB-SoniaNeural',
    avatarAccentColor: '#a855f7',
    avatarSuitColor: '#172554',
    avatarHairColor: '#3b0764',
    defaultMood: 'neutral',
    description:
      'Composed executive interviewer balancing architectural clarity, business impact, system design scalability, and cross-functional communication.',
    systemPrompt: `You are Elena Vance, VP of Engineering. Conduct a polished executive-level interview combining technical architecture, project impact, and structured communication.
Ask ONE concise question at a time, evaluate clarity and measurable outcomes, and adapt follow-up questions based on the candidate's response.`,
  },
];

export const SEED_QUESTION_BANK: QuestionBankItem[] = [
  // HR Mode
  {
    id: 'q-hr-1',
    mode: 'HR',
    topic: 'Ownership & Trade-offs',
    difficulty: 'Easy',
    questionText:
      'Tell me about a time you had to deliver a technical project under a tight deadline where requirements were still shifting. How did you prioritize what to build first?',
    idealKeyPoints: [
      'Clear Situation & Task context',
      'Explicit prioritization framework (critical path vs nice-to-have)',
      'Stakeholder alignment communication',
      'Quantifiable delivery outcome',
    ],
    followUpHints: [
      'What specific feature did you cut or defer, and how did the team react?',
      'If you had two extra weeks on that project, what technical debt would you have addressed first?',
    ],
  },
  {
    id: 'q-hr-2',
    mode: 'HR',
    topic: 'Conflict Resolution',
    difficulty: 'Medium',
    questionText:
      'Describe a situation where you strongly disagreed with a senior teammate or tech lead on an architectural decision. How did you handle the discussion and what was the outcome?',
    idealKeyPoints: [
      'Focus on objective data/benchmarks rather than personal preference',
      'Active listening to the teammate’s constraints',
      'Concrete resolution (prototype, RFC, or commit-and-disagree)',
    ],
    followUpHints: [
      'How did you measure whether the chosen approach succeeded in production?',
    ],
  },
  {
    id: 'q-hr-3',
    mode: 'HR',
    topic: 'Production Incident & Postmortem',
    difficulty: 'Hard',
    questionText:
      'Walk me through the most severe bug or outage you personally introduced or debugged. How did you diagnose the root cause under pressure and prevent recurrence?',
    idealKeyPoints: [
      'Blameless ownership and immediate mitigation steps',
      'Root-cause isolation methodology',
      'Systemic guardrails added (automated tests, alerts, canary rollout)',
    ],
    followUpHints: [
      'What observability signal was missing that could have caught that issue earlier?',
    ],
  },

  // Technical Mode: OOP, DBMS, OS, CN, SE, Projects
  {
    id: 'q-tech-oop-1',
    mode: 'Technical',
    topic: 'OOP',
    difficulty: 'Easy',
    questionText:
      'In object-oriented design, why do seasoned engineers often favor composition over inheritance? Give a concrete code or system scenario where inheritance breaks down.',
    idealKeyPoints: [
      'Fragile base class problem and tight coupling',
      'Runtime flexibility via interfaces/delegation',
      'Diamond problem or combinatorial subclass explosion example',
    ],
    followUpHints: [
      'How does the Liskov Substitution Principle relate to the failure mode you described?',
    ],
  },
  {
    id: 'q-tech-dbms-1',
    mode: 'Technical',
    topic: 'DBMS',
    difficulty: 'Medium',
    questionText:
      'Suppose a PostgreSQL query filtering on two columns (status and created_at) suddenly degrades from 8ms to 1.4 seconds as the table hits 20 million rows. How do you diagnose this and order a composite B-Tree index?',
    idealKeyPoints: [
      'EXPLAIN (ANALYZE, BUFFERS) to inspect Seq Scan vs Index Scan',
      'Equality column (status) vs range column (created_at) selectivity in B-Tree prefix rule',
      'Covering index (INCLUDE) or partial index considerations',
    ],
    followUpHints: [
      'What happens to write amplification and HOT updates when you add too many secondary indexes in Postgres?',
    ],
  },
  {
    id: 'q-tech-dbms-2',
    mode: 'Technical',
    topic: 'DBMS',
    difficulty: 'Hard',
    questionText:
      'Compare Read Committed and Serializable isolation levels under MVCC. How can a write skew anomaly occur under Snapshot Isolation / Repeatable Read, and how do you prevent it?',
    idealKeyPoints: [
      'MVCC snapshot visibility rules',
      'Disjoint writes reading overlapping predicate sets (e.g., on-call doctor constraint)',
      'SELECT FOR UPDATE locking or Serializable Snapshot Isolation (SSI)',
    ],
    followUpHints: [
      'When would you choose optimistic concurrency control (version columns) over pessimistic row locking?',
    ],
  },
  {
    id: 'q-tech-os-1',
    mode: 'Technical',
    topic: 'OS',
    difficulty: 'Medium',
    questionText:
      'What happens inside the OS kernel during a context switch between two threads in the same process versus two threads in different processes?',
    idealKeyPoints: [
      'Saving/restoring CPU registers, program counter, and stack pointer',
      'Same process shares virtual address space (page table base register CR3 unchanged)',
      'Different process flushes or tags TLB entries and incurs higher cache miss cost',
    ],
    followUpHints: [
      'How do user-space coroutines or async event loops avoid kernel context-switch overhead?',
    ],
  },
  {
    id: 'q-tech-cn-1',
    mode: 'Technical',
    topic: 'CN',
    difficulty: 'Medium',
    questionText:
      'Explain Head-of-Line (HoL) blocking in HTTP/2 over TCP and how HTTP/3 over QUIC eliminates it at the transport layer.',
    idealKeyPoints: [
      'HTTP/2 multiplexes streams over a single TCP connection; one lost TCP packet stalls all streams',
      'QUIC runs over UDP with independent per-stream byte ordering and loss recovery',
      '0-RTT / 1-RTT TLS 1.3 integrated handshake benefits',
    ],
    followUpHints: [
      'Why might enterprise firewalls or middleboxes force an HTTP/3 client to fall back to HTTP/2?',
    ],
  },
  {
    id: 'q-tech-se-1',
    mode: 'Technical',
    topic: 'SE & System Design',
    difficulty: 'Hard',
    questionText:
      'How would you design an idempotent payment or webhook processing service so that network retries from clients never result in duplicate charges or corrupted state?',
    idealKeyPoints: [
      'Client-generated Idempotency-Key with unique constraint in storage',
      'Atomic state transitions + transactional outbox pattern',
      'Handling concurrent in-flight requests with short-lived lock or status state machine',
    ],
    followUpHints: [
      'How long should idempotency keys be retained, and what happens if the payload differs for the same key?',
    ],
  },
  {
    id: 'q-tech-proj-1',
    mode: 'Technical',
    topic: 'Projects',
    difficulty: 'Easy',
    questionText:
      'Walk me through the architecture of the most technically challenging project you have built. What was the hardest bottleneck you hit and how did you verify your fix?',
    idealKeyPoints: [
      'Clear end-to-end data flow and component boundaries',
      'Specific technical bottleneck (latency, memory, concurrency, state sync)',
      'Before/after metrics and design trade-offs',
    ],
    followUpHints: [
      'If traffic on your project grew 50x tomorrow, which component would fail first?',
    ],
  },

  // DSA Mode Questions
  {
    id: 'q-dsa-1',
    mode: 'DSA',
    topic: 'Arrays & Hashing',
    difficulty: 'Easy',
    questionText:
      'Before jumping into code: how can we find two indices in an unsorted array whose elements sum to a target value in O(n) time, and what is the space trade-off?',
    idealKeyPoints: [
      'Single-pass hash map storing complement -> index',
      'O(n) time complexity, O(n) auxiliary space',
      'Handling duplicate values and negative integers',
    ],
    followUpHints: [
      'If the input array were already sorted in non-decreasing order, how could we reduce auxiliary space to O(1)?',
    ],
  },
  {
    id: 'q-dsa-2',
    mode: 'DSA',
    topic: 'Trees & Graphs',
    difficulty: 'Medium',
    questionText:
      'How do you detect a cycle in a directed graph (such as a package dependency graph), and how does your approach differ from cycle detection in an undirected graph?',
    idealKeyPoints: [
      '3-state DFS coloring (Unvisited, Visiting/In-Recursion-Stack, Visited) or Kahn’s BFS topological sort (indegree)',
      'In directed graphs, a shared visited node is only a cycle if it is on the current active recursion path',
      'O(V + E) time and O(V) space',
    ],
    followUpHints: [
      'How would you modify Kahn’s algorithm to output the exact lexicographically smallest valid build order?',
    ],
  },
  {
    id: 'q-dsa-3',
    mode: 'DSA',
    topic: 'Dynamic Programming',
    difficulty: 'Hard',
    questionText:
      'Explain the state transition and space optimization for finding the Longest Common Subsequence (LCS) or Edit Distance between two strings of length M and N.',
    idealKeyPoints: [
      '2D DP state dp[i][j] representing prefix alignments',
      'Rolling 1D array optimization reducing space from O(M*N) to O(min(M, N))',
      'When full 2D table is still required (reconstructing the actual sequence)',
    ],
    followUpHints: [
      'How does Myers diff algorithm improve upon standard O(M*N) DP when two files have very few differences?',
    ],
  },
  {
    id: 'q-dsa-easy-2',
    mode: 'DSA',
    topic: 'Strings & Two Pointers',
    difficulty: 'Easy',
    questionText:
      'Given a string with alphanumeric characters and symbols, how do you verify whether it is a palindrome in O(n) time and O(1) space without creating an extra reversed string?',
    idealKeyPoints: [
      'Two pointers moving inward from left and right',
      'Skip non-alphanumeric characters dynamically',
      'Case-insensitive character comparison',
    ],
    followUpHints: [
      'What if at most one character deletion is permitted (Valid Palindrome II)?',
    ],
  },
  {
    id: 'q-dsa-med-2',
    mode: 'DSA',
    topic: 'Strings & Sliding Window',
    difficulty: 'Medium',
    questionText:
      'Explain the sliding window algorithm for finding the length of the longest substring without repeating characters in O(n) time. How does a hash map accelerate the left pointer jump?',
    idealKeyPoints: [
      'Sliding window with left and right pointers',
      'Hash map storing character -> last seen index',
      'When duplicate encountered, left = max(left, last_seen[char] + 1)',
    ],
    followUpHints: [
      'How would you adapt this if up to k distinct characters were allowed?',
    ],
  },
  {
    id: 'q-dsa-hard-2',
    mode: 'DSA',
    topic: 'Arrays & Monotonic Stack',
    difficulty: 'Hard',
    questionText:
      'Explain the algorithm for solving the Trapping Rain Water problem. Compare the two-pointer approach in O(n) time and O(1) space with the Monotonic Stack approach.',
    idealKeyPoints: [
      'Water trapped above index i is determined by min(max_left, max_right) - height[i]',
      'Two pointers track left_max and right_max, advancing inward from the smaller boundary',
      'Monotonic decreasing stack computes horizontal water slabs bounded by taller walls',
    ],
    followUpHints: [
      'How does the problem change if the terrain is a 2D elevation grid with Min-Heap BFS?',
    ],
  },
  {
    id: 'q-tech-dbms-easy-1',
    mode: 'Technical',
    topic: 'DBMS',
    difficulty: 'Easy',
    questionText:
      'What are the key differences between a Primary Key, a Unique Key, and a Foreign Key in relational database modeling? Can a table have multiple unique keys?',
    idealKeyPoints: [
      'Primary key enforces non-null uniqueness (only one per table)',
      'Unique key allows nulls (in most engines like Postgres/MySQL) and multiple can exist',
      'Foreign key maintains referential integrity between parent and child tables',
    ],
    followUpHints: [
      'How does an index automatically back unique constraints in engines like PostgreSQL?',
    ],
  },
  {
    id: 'q-tech-os-easy-1',
    mode: 'Technical',
    topic: 'OS',
    difficulty: 'Easy',
    questionText:
      'Explain the fundamental difference between a Process and a Thread. What resources are shared between threads of the same process, and what remains private to each thread?',
    idealKeyPoints: [
      'Processes have independent virtual memory address spaces and file descriptors',
      'Threads share heap, code, data, and global variables within the parent process',
      'Each thread has its own private execution stack, registers, and Program Counter (PC)',
    ],
    followUpHints: [
      'Why is thread creation generally much cheaper than process creation in Linux (fork vs clone)?',
    ],
  },
  {
    id: 'q-tech-cn-easy-1',
    mode: 'Technical',
    topic: 'CN',
    difficulty: 'Easy',
    questionText:
      'Walk through the TCP 3-Way Handshake (SYN, SYN-ACK, ACK). Why are 3 packets needed instead of 2 before establishing a reliable two-way data stream?',
    idealKeyPoints: [
      'Client sends SYN with initial sequence number (ISN_A)',
      'Server responds with SYN-ACK with ISN_B and ACK_A+1',
      'Client completes with ACK_B+1 to synchronize both sender and receiver window boundaries',
    ],
    followUpHints: [
      'What is a SYN Flood attack and how do SYN Cookies mitigate it without exhausting server memory?',
    ],
  },
  {
    id: 'q-tech-os-hard-1',
    mode: 'Technical',
    topic: 'OS & Memory',
    difficulty: 'Hard',
    questionText:
      'Explain multi-level virtual memory paging, Translation Lookaside Buffer (TLB) misses, and how the kernel handles a Major vs Minor Page Fault when a process accesses mmap memory.',
    idealKeyPoints: [
      'Hierarchical page tables (PML4, PDPT, PD, PT) on x86-64',
      'Minor page fault allocates physical page frame without disk I/O',
      'Major page fault reads pages from disk/swap into RAM, blocking the executing thread',
      'Copy-On-Write (COW) mechanics during fork()',
    ],
    followUpHints: [
      'What are HugePages (2MB / 1GB) and when do database engines benefit from them?',
    ],
  },
];

export const SEED_CODING_PROBLEMS: CodingProblem[] = [
  {
    id: 'prob-two-sum',
    title: '1. Optimal Pair Sum Indices',
    topic: 'Arrays & Hashing',
    difficulty: 'Easy',
    description:
      'Given an array of integers `nums` and an integer `target`, return the two 0-based indices `i` and `j` (`i < j`) such that `nums[i] + nums[j] == target`. You may assume that each input has exactly one valid solution, and you may not use the same element twice.\n\nBefore or while coding, explain your approach and time/space complexity verbally using the microphone or approach box.',
    constraints: [
      '2 <= nums.length <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Expected Time Complexity: O(n) | Expected Space Complexity: O(n)',
    ],
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'nums[0] + nums[1] == 2 + 7 == 9, so we return [0, 1].',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
        explanation: 'nums[1] + nums[2] == 2 + 4 == 6, so we return [1, 2].',
      },
    ],
    testCases: [
      { id: 'tc-1', input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
      { id: 'tc-2', input: '[3,2,4]\n6', expectedOutput: '[1,2]' },
      { id: 'tc-3', input: '[3,3]\n6', expectedOutput: '[0,1]' },
      { id: 'tc-4', input: '[-3,4,3,90]\n0', expectedOutput: '[0,2]' },
    ],
    optimalTimeComplexity: 'O(n)',
    optimalSpaceComplexity: 'O(n)',
    referenceSolutionSummary:
      'Use a single-pass hash map mapping each seen value to its index. For each element x at index i, check if (target - x) is already in the map.',
    starterCode: {
      python: `def solve(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
`,
      javascript: `function solve(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}
`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> solve(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}
`,
      java: `import java.util.*;

public class Solution {
    public static int[] solve(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[]{seen.get(complement), i};
            }
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}
`,
      c: `#include <stdlib.h>

// Return a dynamically allocated 2-element array [i, j]
int* solve(const int* nums, int n, int target) {
    int* res = (int*)malloc(2 * sizeof(int));
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                res[0] = i;
                res[1] = j;
                return res;
            }
        }
    }
    return res;
}
`,
    },
  },
  {
    id: 'prob-longest-unique-substr',
    title: '2. Longest Substring Without Repeating Characters',
    topic: 'Strings & Sliding Window',
    difficulty: 'Medium',
    description:
      'Given a string `s`, find the length of the longest contiguous substring that contains no repeating characters.\n\nExplain how your sliding window pointers move and why each character is visited at most twice.',
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
      'Expected Time Complexity: O(n) | Expected Space Complexity: O(min(m, n))',
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3.',
      },
    ],
    testCases: [
      { id: 'tc-201', input: '"abcabcbb"', expectedOutput: '3' },
      { id: 'tc-202', input: '"bbbbb"', expectedOutput: '1' },
      { id: 'tc-203', input: '"pwwkew"', expectedOutput: '3' },
      { id: 'tc-204', input: '""', expectedOutput: '0' },
    ],
    optimalTimeComplexity: 'O(n)',
    optimalSpaceComplexity: 'O(min(m, n))',
    referenceSolutionSummary:
      'Maintain a sliding window [left, right] and a map of character -> last seen index. Advance left = max(left, lastSeen[ch] + 1) on collision.',
    starterCode: {
      python: `def solve(s: str) -> int:
    last_seen = {}
    left = 0
    max_len = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        max_len = max(max_len, right - left + 1)
    return max_len
`,
      javascript: `function solve(s) {
  const lastSeen = new Map();
  let left = 0;
  let maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) {
      left = lastSeen.get(ch) + 1;
    }
    lastSeen.set(ch, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}
`,
      cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int solve(string s) {
    vector<int> lastSeen(256, -1);
    int left = 0, maxLen = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        unsigned char c = s[right];
        if (lastSeen[c] >= left) {
            left = lastSeen[c] + 1;
        }
        lastSeen[c] = right;
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}
`,
      java: `import java.util.*;

public class Solution {
    public static int solve(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0, maxLen = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {
                left = lastSeen.get(c) + 1;
            }
            lastSeen.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }
}
`,
      c: `#include <string.h>

int solve(const char* s) {
    int lastSeen[256];
    for (int i = 0; i < 256; i++) lastSeen[i] = -1;
    int left = 0, maxLen = 0;
    for (int right = 0; s[right] != '\\0'; right++) {
        unsigned char c = (unsigned char)s[right];
        if (lastSeen[c] >= left) left = lastSeen[c] + 1;
        lastSeen[c] = right;
        int len = right - left + 1;
        if (len > maxLen) maxLen = len;
    }
    return maxLen;
}
`,
    },
  },
  {
    id: 'prob-merge-intervals',
    title: '3. Merge Overlapping Time Intervals',
    topic: 'Sorting & Greedy',
    difficulty: 'Medium',
    description:
      'Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
    constraints: [
      '1 <= intervals.length <= 10^4',
      'intervals[i].length == 2',
      '0 <= start_i <= end_i <= 10^4',
      'Expected Time Complexity: O(n log n) | Expected Space Complexity: O(n)',
    ],
    examples: [
      {
        input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
        output: '[[1,6],[8,10],[15,18]]',
        explanation: 'Intervals [1,3] and [2,6] overlap, so they merge into [1,6].',
      },
    ],
    testCases: [
      {
        id: 'tc-301',
        input: '[[1,3],[2,6],[8,10],[15,18]]',
        expectedOutput: '[[1,6],[8,10],[15,18]]',
      },
      {
        id: 'tc-302',
        input: '[[1,4],[4,5]]',
        expectedOutput: '[[1,5]]',
      },
      {
        id: 'tc-303',
        input: '[[1,4],[0,4]]',
        expectedOutput: '[[0,4]]',
      },
    ],
    optimalTimeComplexity: 'O(n log n)',
    optimalSpaceComplexity: 'O(n)',
    referenceSolutionSummary:
      'Sort intervals by start time ascending. Iterate through sorted intervals and either extend the last merged interval end or append a new disjoint interval.',
    starterCode: {
      python: `def solve(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for current in intervals[1:]:
        if current[0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], current[1])
        else:
            merged.append(current)
    return merged
`,
      javascript: `function solve(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = merged[merged.length - 1];
    if (intervals[i][0] <= prev[1]) {
      prev[1] = Math.max(prev[1], intervals[i][1]);
    } else {
      merged.push(intervals[i]);
    }
  }
  return merged;
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

vector<vector<int>> solve(vector<vector<int>>& intervals) {
    if (intervals.empty()) return {};
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> merged = {intervals[0]};
    for (size_t i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] <= merged.back()[1]) {
            merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        } else {
            merged.push_back(intervals[i]);
        }
    }
    return merged;
}
`,
      java: `import java.util.*;

public class Solution {
    public static int[][] solve(int[][] intervals) {
        if (intervals.length <= 1) return intervals;
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        List<int[]> merged = new ArrayList<>();
        int[] current = intervals[0];
        merged.add(current);
        for (int[] next : intervals) {
            if (next[0] <= current[1]) {
                current[1] = Math.max(current[1], next[1]);
            } else {
                current = next;
                merged.add(current);
            }
        }
        return merged.toArray(new int[merged.size()][]);
    }
}
`,
      c: `// Sort intervals by start time and merge overlapping ranges in-place
int solve(int intervals[][2], int n) {
    if (n <= 1) return n;
    int idx = 0;
    for (int i = 1; i < n; i++) {
        if (intervals[idx][1] >= intervals[i][0]) {
            if (intervals[i][1] > intervals[idx][1])
                intervals[idx][1] = intervals[i][1];
        } else {
            idx++;
            intervals[idx][0] = intervals[i][0];
            intervals[idx][1] = intervals[i][1];
        }
    }
    return idx + 1;
}
`,
    },
  },
  {
    id: 'prob-coin-change-dp',
    title: '4. Minimum Coins for Target Amount (DP)',
    topic: 'Dynamic Programming',
    difficulty: 'Hard',
    description:
      'You are given an integer array `coins` representing coin denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.',
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4',
      'Expected Time Complexity: O(amount * coins.length) | Space: O(amount)',
    ],
    examples: [
      {
        input: 'coins = [1, 2, 5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1 (3 coins).',
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1',
        explanation: 'Amount 3 cannot be formed with only denomination 2.',
      },
    ],
    testCases: [
      { id: 'tc-401', input: '[1,2,5]\n11', expectedOutput: '3' },
      { id: 'tc-402', input: '[2]\n3', expectedOutput: '-1' },
      { id: 'tc-403', input: '[1]\n0', expectedOutput: '0' },
    ],
    optimalTimeComplexity: 'O(amount * N)',
    optimalSpaceComplexity: 'O(amount)',
    referenceSolutionSummary:
      'Bottom-up 1D DP array of size amount + 1 initialized to amount + 1, with dp[0] = 0. For each value a from 1..amount and coin c <= a, dp[a] = min(dp[a], dp[a - c] + 1).',
    starterCode: {
      python: `def solve(coins, amount):
    dp = [amount + 1] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if a - c >= 0:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != amount + 1 else -1
`,
      javascript: `function solve(coins, amount) {
  const dp = new Array(amount + 1).fill(amount + 1);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (a - c >= 0) {
        dp[a] = Math.min(dp[a], dp[a - c] + 1);
      }
    }
  }
  return dp[amount] > amount ? -1 : dp[amount];
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

int solve(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, amount + 1);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (a - c >= 0) {
                dp[a] = min(dp[a], dp[a - c] + 1);
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
`,
      java: `import java.util.*;

public class Solution {
    public static int solve(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (a - c >= 0) {
                    dp[a] = Math.min(dp[a], dp[a - c] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
`,
      c: `int solve(const int* coins, int n, int amount) {
    int dp[10005];
    for (int i = 0; i <= amount; i++) dp[i] = amount + 1;
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int j = 0; j < n; j++) {
            if (a - coins[j] >= 0 && dp[a - coins[j]] + 1 < dp[a]) {
                dp[a] = dp[a - coins[j]] + 1;
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
`,
    },
  },
];

export const INITIAL_REPORTS: InterviewReportRecord[] = [
  {
    id: 'rep-seed-101',
    sessionId: 'sess-seed-101',
    createdAt: '2026-11-08T14:30:00Z',
    mode: 'Technical',
    subTopic: 'DBMS & Distributed Systems',
    difficulty: 'Medium',
    personaId: 'persona-kenji-tech',
    personaName: 'Kenji Sato',
    overallScore: 84,
    categoryScores: {
      answerQuality: 86,
      communication: 81,
      technicalCorrectness: 85,
      presentation: 82,
    },
    voiceSummary: {
      avgWpm: 132,
      totalFillers: 3,
      fillerBreakdown: { um: 2, basically: 1 },
      longPauses: 1,
      totalDurationSeconds: 185,
      speakingConsistency: 89,
    },
    presentationSummary: {
      faceVisibilityPct: 98,
      gazeAlignmentPct: 86,
      postureStabilityPct: 90,
      shoulderAlignmentPct: 88,
      gentleObservations: [
        'Steady upper-body framing and consistent eye-line alignment throughout technical explanations.',
      ],
    },
    strongestAnswerSummary:
      'Clear explanation of PostgreSQL composite B-Tree index column ordering (equality prefix before range scan) and EXPLAIN ANALYZE buffer inspection.',
    weakestAnswerSummary:
      'Under-specified how Serializable Snapshot Isolation (SSI) detects rw-antidependency cycles compared to pessimistic SELECT FOR UPDATE locks.',
    actionableImprovements: [
      'When discussing database isolation levels, explicitly contrast optimistic rw-conflict detection with row-level lock contention.',
      'Replace transitional "um" pauses when switching from high-level architecture to concrete SQL syntax.',
    ],
    qaBreakdown: [
      {
        id: 'qa-101-1',
        questionNumber: 1,
        topic: 'DBMS Indexing',
        difficulty: 'Medium',
        questionText:
          'Suppose a PostgreSQL query filtering on status and created_at degrades from 8ms to 1.4s at 20M rows. How do you diagnose this and order a composite B-Tree index?',
        candidateAnswer:
          'First I run EXPLAIN (ANALYZE, BUFFERS) to confirm if the planner is doing a Sequential Scan or reading excessive heap pages. For a composite B-Tree index, I place the equality predicate column (status) first and the range column (created_at) second so the index range scan stays contiguous.',
        interviewerFeedback:
          'Strong, methodical answer. You identified both the diagnostic tool and the exact B-Tree prefix ordering rule.',
        score: 90,
        technicalScore: 92,
        wpm: 136,
        fillerCount: 1,
        durationSeconds: 92,
        moodTag: 'encouraging',
        gestureTag: 'nod',
        strengths: ['EXPLAIN (ANALYZE, BUFFERS) usage', 'Equality before range prefix rule'],
        improvements: ['Mention index-only scans with INCLUDE for covering columns'],
      },
      {
        id: 'qa-101-2',
        questionNumber: 2,
        topic: 'MVCC & Isolation',
        difficulty: 'Hard',
        questionText:
          'How can a write skew anomaly occur under Snapshot Isolation, and how do you prevent it?',
        candidateAnswer:
          'Um write skew happens when two concurrent transactions read the same dataset snapshot and each updates disjoint rows that together violate a business invariant, like two on-call engineers both going off-duty. We can prevent it using SELECT FOR UPDATE or SERIALIZABLE isolation.',
        interviewerFeedback:
          'Good concrete example with on-call scheduling. Dig deeper into how SSI tracks SIREAD locks without blocking readers.',
        score: 79,
        technicalScore: 78,
        wpm: 128,
        fillerCount: 2,
        durationSeconds: 93,
        moodTag: 'thinking',
        gestureTag: 'head_tilt',
        strengths: ['Concrete on-call invariant example', 'Identified SELECT FOR UPDATE mitigation'],
        improvements: ['Detail SIREAD predicate locks in PostgreSQL SSI'],
      },
    ],
  },
  {
    id: 'rep-seed-102',
    sessionId: 'sess-seed-102',
    createdAt: '2026-11-05T17:15:00Z',
    mode: 'DSA',
    subTopic: 'Arrays, Sliding Window & DP',
    difficulty: 'Medium',
    personaId: 'persona-elena-corp',
    personaName: 'Elena Vance',
    overallScore: 79,
    categoryScores: {
      answerQuality: 80,
      communication: 76,
      technicalCorrectness: 82,
      presentation: 78,
    },
    voiceSummary: {
      avgWpm: 141,
      totalFillers: 5,
      fillerBreakdown: { like: 2, uh: 2, actually: 1 },
      longPauses: 2,
      totalDurationSeconds: 240,
      speakingConsistency: 82,
    },
    presentationSummary: {
      faceVisibilityPct: 96,
      gazeAlignmentPct: 79,
      postureStabilityPct: 84,
      shoulderAlignmentPct: 85,
      gentleObservations: [
        'Eye-line shifted downward frequently while typing in the code editor; periodically glancing up when summarizing trade-offs improves engagement.',
      ],
    },
    codingSubmission: {
      problemTitle: '1. Optimal Pair Sum Indices',
      language: 'python',
      passedTests: 4,
      totalTests: 4,
      code: `def solve(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []`,
      verbalApproachTranscript:
        'I will use a single-pass hash map mapping each number to its index so we can look up target minus num in O(1) average time, giving O(n) overall time and O(n) space.',
      complexityEvaluation:
        'Optimal O(n) time and O(n) auxiliary space verified across all 4 test cases including negative integers and duplicate values.',
      aiCodeScore: 92,
    },
    strongestAnswerSummary:
      'Clean O(n) single-pass hash map implementation with clear verbal complexity justification before coding.',
    weakestAnswerSummary:
      'In the follow-up on Dynamic Programming state space reduction, paused twice before articulating why iterating backwards is required for 0/1 Knapsack 1D arrays.',
    actionableImprovements: [
      'State loop direction invariants explicitly when reducing 2D DP tables to 1D arrays.',
      'Reduce "like" and "uh" fillers during live code walkthroughs.',
    ],
    qaBreakdown: [
      {
        id: 'qa-102-1',
        questionNumber: 1,
        topic: 'Arrays & Hashing',
        difficulty: 'Easy',
        questionText:
          'Explain your approach to finding two indices that sum to target in O(n) time before implementing it.',
        candidateAnswer:
          'I will iterate through the array once while maintaining a dictionary of value-to-index. For each element, I check if target minus the current element is already in the dictionary. That achieves O(n) time and O(n) space.',
        interviewerFeedback:
          'Crisp verbal walkthrough prior to coding.',
        score: 88,
        technicalScore: 92,
        wpm: 142,
        fillerCount: 1,
        durationSeconds: 65,
        moodTag: 'happy',
        gestureTag: 'nod',
        strengths: ['Clear complexity analysis before typing code'],
        improvements: ['Mention hash collision worst-case vs amortized O(1)'],
      },
      {
        id: 'qa-102-2',
        questionNumber: 2,
        topic: 'Dynamic Programming',
        difficulty: 'Hard',
        questionText:
          'How do you optimize space complexity in 1D Dynamic Programming for Coin Change vs 0/1 Knapsack?',
        candidateAnswer:
          'Uh in Coin Change we can reuse each coin unlimited times so we iterate forward, whereas in 0/1 Knapsack we like iterate backward so we only use each item once from the previous row.',
        interviewerFeedback:
          'Correct distinction between unbounded and 0/1 transitions, though delivery had two long pauses.',
        score: 72,
        technicalScore: 76,
        wpm: 139,
        fillerCount: 4,
        durationSeconds: 110,
        moodTag: 'neutral',
        gestureTag: 'explain',
        strengths: ['Accurate forward vs reverse iteration insight'],
        improvements: ['Practice writing the recurrence relation before coding the loop'],
      },
    ],
  },
  {
    id: 'rep-seed-103',
    sessionId: 'sess-seed-103',
    createdAt: '2026-11-01T11:00:00Z',
    mode: 'HR',
    subTopic: 'Behavioral & Leadership STAR',
    difficulty: 'Medium',
    personaId: 'persona-waguri-hr',
    personaName: 'Waguri Aoi',
    overallScore: 81,
    categoryScores: {
      answerQuality: 84,
      communication: 83,
      technicalCorrectness: 76,
      presentation: 80,
    },
    voiceSummary: {
      avgWpm: 128,
      totalFillers: 2,
      fillerBreakdown: { um: 1, actually: 1 },
      longPauses: 0,
      totalDurationSeconds: 160,
      speakingConsistency: 92,
    },
    presentationSummary: {
      faceVisibilityPct: 100,
      gazeAlignmentPct: 88,
      postureStabilityPct: 86,
      shoulderAlignmentPct: 90,
      gentleObservations: [
        'Consistent eye-line alignment and natural pacing across STAR behavioral stories.',
      ],
    },
    strongestAnswerSummary:
      'Compelling STAR breakdown of resolving an API contract disagreement using benchmark prototypes.',
    weakestAnswerSummary:
      'Could quantify the downstream latency reduction percentage more explicitly in the Result section.',
    actionableImprovements: [
      'Always close STAR behavioral answers with a concrete metric (e.g., p95 latency drop or deployment time saved).',
    ],
    qaBreakdown: [
      {
        id: 'qa-103-1',
        questionNumber: 1,
        topic: 'Conflict Resolution',
        difficulty: 'Medium',
        questionText:
          'Describe a situation where you disagreed with a teammate on an architectural decision.',
        candidateAnswer:
          'During our migration to event-driven workers, a senior engineer preferred polling Postgres every second while I proposed Redis Streams. Instead of debating abstractly, I built a 2-hour benchmark showing CPU load at 500 RPS, which aligned the team.',
        interviewerFeedback:
          'Excellent data-driven conflict resolution.',
        score: 86,
        technicalScore: 80,
        wpm: 128,
        fillerCount: 2,
        durationSeconds: 160,
        moodTag: 'happy',
        gestureTag: 'nod',
        strengths: ['Used objective benchmark prototype to resolve disagreement'],
        improvements: ['Quantify the long-term production cost savings'],
      },
    ],
  },
];
