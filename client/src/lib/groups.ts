/**
 * Groups and User@groupname resolution
 */

import { apiRequest } from "./queryClient";

export type Group = {
  id: number;
  creatorId: number;
  name: string;
  displayName: string;
  description: string | null;
  createdAt: string;
};

export type GroupMember = {
  id: number;
  groupId: number;
  userId: number;
  inGroupHandle: string;
  role: "admin" | "member";
  joinedAt: string;
  user?: {
    id: number;
    username: string;
    displayName: string;
    avatarCid?: string | null;
    did?: string;
  };
};

/** Parse "handle@groupname" into { handle, groupPart } */
export function parseHandleAtGroup(text: string): { handle: string; groupPart: string } | null {
  const match = text.match(/^([a-zA-Z0-9_-]+)@([a-zA-Z0-9_-]+)$/);
  if (!match) return null;
  return { handle: match[1], groupPart: match[2] };
}

/** Resolve handle within a group to user info */
export async function resolveHandleInGroup(
  groupId: number,
  handle: string
): Promise<{ id: number; username: string; displayName: string; did?: string; avatarCid?: string } | null> {
  try {
    const res = await fetch(
      `/api/resolve-handle?groupId=${groupId}&handle=${encodeURIComponent(handle)}`,
      { credentials: "include" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Create a group */
export async function createGroup(data: {
  name: string;
  displayName: string;
  description?: string;
}): Promise<Group> {
  const res = await apiRequest("POST", "/api/groups", data);
  return res.json();
}

/** Fetch groups for current user */
export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch("/api/groups", { credentials: "include" });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to fetch groups");
  return res.json();
}

/** Fetch group by id */
export async function fetchGroup(id: number): Promise<Group> {
  const res = await fetch(`/api/groups/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch group");
  return res.json();
}

/** Fetch group members */
export async function fetchGroupMembers(groupId: number): Promise<GroupMember[]> {
  const res = await fetch(`/api/groups/${groupId}/members`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

// DAO proposals and votes
export type ProposalType = "add_member" | "remove_member" | "change_role" | "config_change";
export type ProposalStatus = "pending" | "passed" | "rejected" | "executed";
export type VoteChoice = "for" | "against" | "abstain";

export type GroupProposal = {
  id: number;
  groupId: number;
  type: ProposalType;
  proposerId: number;
  payload: Record<string, unknown>;
  status: ProposalStatus;
  createdAt: string;
  votingEndsAt: string;
  executedAt: string | null;
};

export type GroupVote = {
  id: number;
  proposalId: number;
  userId: number;
  vote: VoteChoice;
  createdAt: string;
};

export async function fetchProposals(groupId: number, status?: ProposalStatus): Promise<GroupProposal[]> {
  const url = status ? `/api/groups/${groupId}/proposals?status=${status}` : `/api/groups/${groupId}/proposals`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch proposals");
  return res.json();
}

export async function createProposal(
  groupId: number,
  data: { type: ProposalType; payload: Record<string, unknown>; votingEndsAt: string }
): Promise<GroupProposal> {
  const res = await apiRequest("POST", `/api/groups/${groupId}/proposals`, data);
  return res.json();
}

export async function castVote(
  groupId: number,
  proposalId: number,
  vote: VoteChoice
): Promise<GroupVote> {
  const res = await apiRequest("POST", `/api/groups/${groupId}/proposals/${proposalId}/vote`, { vote });
  return res.json();
}

export async function tallyProposal(groupId: number, proposalId: number): Promise<GroupProposal> {
  const res = await apiRequest("POST", `/api/groups/${groupId}/proposals/${proposalId}/tally`);
  return res.json();
}

export async function executeProposal(groupId: number, proposalId: number): Promise<{ message: string }> {
  const res = await apiRequest("POST", `/api/groups/${groupId}/proposals/${proposalId}/execute`);
  return res.json();
}

export async function fetchGroupChain(groupId: number): Promise<Array<{ id: number; action: string; authorDid: string; createdAt: string; metadata?: Record<string, unknown> }>> {
  const res = await fetch(`/api/groups/${groupId}/chain`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch chain");
  return res.json();
}
