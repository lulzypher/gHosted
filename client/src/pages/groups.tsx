import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser } from "@/contexts/UserContext";
import {
  fetchGroups,
  fetchGroupMembers,
  fetchProposals,
  createGroup,
  createProposal,
  castVote,
  tallyProposal,
  executeProposal,
  type Group,
  type GroupMember,
  type GroupProposal,
  type ProposalType,
} from "@/lib/groups";
import { Users, Plus, Loader, User, Vote, FileText, Settings2, Newspaper, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ServerRequiredFallback } from "@/components/ServerRequiredFallback";
import { ipfsUrl } from "@/lib/ipfsGateway";

export default function GroupsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  
  const isDecentralized = !!(user?.did && (user?.id === 0 || user?.id == null));
  if (isDecentralized) {
    return <ServerRequiredFallback feature="groups" />;
  }
  const queryClient = useQueryClient();
  const [createName, setCreateName] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: groups, isLoading } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: fetchGroups,
  });

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setCreateOpen(false);
      setCreateName("");
      setCreateDisplayName("");
      setCreateDescription("");
      toast({ title: "Group created", description: "You can now add members." });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create group", description: e.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!createName.trim() || !createDisplayName.trim()) {
      toast({ title: "Required", description: "Name and display name are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: createName.trim().toLowerCase(),
      displayName: createDisplayName.trim(),
      description: createDescription.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        <LeftSidebar />
        <div className="flex-1 space-y-4 max-w-3xl mx-auto w-full">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Groups</h1>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Group</DialogTitle>
                    <DialogDescription>
                      DAO-style groups: members propose, members vote. Handles like User@groupname. You’ll be the admin.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">Handle (lowercase, no spaces)</label>
                      <Input
                        placeholder="devs"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Display name</label>
                      <Input
                        placeholder="Developers"
                        value={createDisplayName}
                        onChange={(e) => setCreateDisplayName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (optional)</label>
                      <Input
                        placeholder="A group for developers"
                        value={createDescription}
                        onChange={(e) => setCreateDescription(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending || !createName.trim() || !createDisplayName.trim()}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-muted-foreground">Loading groups...</p>
              </div>
            ) : !groups?.length ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-lg font-medium">No groups yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a group to use User@groupname handles (e.g. alice@devs).
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create group
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((g: Group) => (
                  <GroupCard key={g.id} group={g} currentUser={user} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

const GROUP_OPTIONS_KEY = "ghosted-group-options";

function getGroupFeedOptions(groupId: number): { showGroupFeed: boolean; showMemberActivity: boolean } {
  try {
    const raw = localStorage.getItem(`${GROUP_OPTIONS_KEY}-${groupId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { showGroupFeed: false, showMemberActivity: false };
}

function setGroupFeedOptions(groupId: number, opts: { showGroupFeed: boolean; showMemberActivity: boolean }) {
  localStorage.setItem(`${GROUP_OPTIONS_KEY}-${groupId}`, JSON.stringify(opts));
}

function GroupCard({ group, currentUser }: { group: Group; currentUser: { id?: number } | null }) {
  const [expanded, setExpanded] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [feedOptions, setFeedOptions] = useState(() => getGroupFeedOptions(group.id));
  const { data: members, isLoading } = useQuery({
    queryKey: ["/api/groups", group.id, "members"],
    queryFn: () => fetchGroupMembers(group.id),
    enabled: expanded,
  });
  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ["/api/groups", group.id, "proposals"],
    queryFn: () => fetchProposals(group.id),
    enabled: expanded,
  });

  const myMembership = members?.find((m: GroupMember) => m.userId === currentUser?.id);
  const canPropose = myMembership && ["admin", "core"].includes(myMembership.role);
  const isAdmin = myMembership?.role === "admin";

  const updateFeedOption = (key: "showGroupFeed" | "showMemberActivity", value: boolean) => {
    const next = { ...feedOptions, [key]: value };
    setFeedOptions(next);
    setGroupFeedOptions(group.id, next);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{group.displayName}</h3>
          <p className="text-sm text-muted-foreground">
            @{group.name}
            {group.description && ` · ${group.description}`}
          </p>
        </div>
        <div className="flex gap-1">
          {isAdmin && (
            <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Group feed options</DialogTitle>
                  <DialogDescription>
                    Enable tabs to see posts shared to this group and activity from members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedOptions.showGroupFeed}
                      onChange={(e) => updateFeedOption("showGroupFeed", e.target.checked)}
                    />
                    <Newspaper className="h-4 w-4" />
                    Show Group feed tab (posts shared to this group)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedOptions.showMemberActivity}
                      onChange={(e) => updateFeedOption("showMemberActivity", e.target.checked)}
                    />
                    <Activity className="h-4 w-4" />
                    Show Member activity tab (posts by members)
                  </label>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Hide" : "View"}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="flex flex-wrap gap-1 w-full">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="proposals">
                Proposals
                {proposals?.filter((p: GroupProposal) => p.status === "pending").length ? (
                  <span className="ml-1 text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded px-1">
                    {proposals.filter((p: GroupProposal) => p.status === "pending").length}
                  </span>
                ) : null}
              </TabsTrigger>
              {feedOptions.showGroupFeed && <TabsTrigger value="groupfeed">Group feed</TabsTrigger>}
              {feedOptions.showMemberActivity && <TabsTrigger value="memberactivity">Member activity</TabsTrigger>}
            </TabsList>
            <TabsContent value="members" className="mt-3">
              {isLoading ? (
                <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="space-y-2">
                  {members?.map((m: GroupMember) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-muted">
                        {m.user?.avatarCid ? (
                          <img src={ipfsUrl(m.user.avatarCid)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-primary">{m.inGroupHandle}@{group.name}</span>
                      {m.user && <span className="text-muted-foreground">({m.user.displayName})</span>}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{m.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="proposals" className="mt-3">
              <ProposalsSection groupId={group.id} proposals={proposals} isLoading={proposalsLoading} canPropose={!!canPropose} isAdmin={!!isAdmin} currentUserId={currentUser?.id} queryKey={["/api/groups", group.id, "proposals"]} />
            </TabsContent>
            {feedOptions.showGroupFeed && (
              <TabsContent value="groupfeed" className="mt-3">
                <div className="p-4 border rounded-lg bg-muted/30 text-center text-muted-foreground">
                  <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Posts shared to this group will appear here.</p>
                  <p className="text-xs mt-1">Group feed coming soon with OrbitDB.</p>
                </div>
              </TabsContent>
            )}
            {feedOptions.showMemberActivity && (
              <TabsContent value="memberactivity" className="mt-3">
                <div className="p-4 border rounded-lg bg-muted/30 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Posts by group members will appear here.</p>
                  <p className="text-xs mt-1">Member activity feed coming soon with OrbitDB.</p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </Card>
  );
}

function ProposalsSection({
  groupId,
  proposals,
  isLoading,
  canPropose,
  isAdmin,
  currentUserId,
  queryKey,
}: {
  groupId: number;
  proposals?: GroupProposal[];
  isLoading: boolean;
  canPropose: boolean;
  isAdmin: boolean;
  currentUserId?: number;
  queryKey: unknown[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ProposalType>("add_member");
  const [createUserId, setCreateUserId] = useState("");
  const [createHandle, setCreateHandle] = useState("");
  const [createVotingDays, setCreateVotingDays] = useState(3);

  const createMutation = useMutation({
    mutationFn: (data: { type: ProposalType; payload: Record<string, unknown>; votingEndsAt: string }) =>
      createProposal(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setCreateOpen(false);
      toast({ title: "Proposal created" });
    },
    onError: (e: Error) => toast({ title: "Failed to create proposal", description: e.message, variant: "destructive" }),
  });

  const voteMutation = useMutation({
    mutationFn: ({ proposalId, vote }: { proposalId: number; vote: "for" | "against" | "abstain" }) =>
      castVote(groupId, proposalId, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Vote recorded" });
    },
    onError: (e: Error) => toast({ title: "Vote failed", description: e.message, variant: "destructive" }),
  });

  const tallyMutation = useMutation({
    mutationFn: (proposalId: number) => tallyProposal(groupId, proposalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const executeMutation = useMutation({
    mutationFn: (proposalId: number) => executeProposal(groupId, proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      toast({ title: "Proposal executed" });
    },
    onError: (e: Error) => toast({ title: "Execute failed", description: e.message, variant: "destructive" }),
  });

  const handleCreateProposal = () => {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + createVotingDays);
    const payload =
      createType === "add_member"
        ? { userId: parseInt(createUserId), inGroupHandle: createHandle.trim() }
        : createType === "remove_member"
          ? { userId: parseInt(createUserId) }
          : createType === "change_role"
            ? { userId: parseInt(createUserId), role: createHandle || "member" }
            : {};
    createMutation.mutate({
      type: createType,
      payload,
      votingEndsAt: endsAt.toISOString(),
    });
  };

  if (isLoading) return <Loader className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      {canPropose && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              New Proposal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Proposal</DialogTitle>
              <DialogDescription>Proposals require a vote from members. Add member, remove member, or change role.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as ProposalType)}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                >
                  <option value="add_member">Add member</option>
                  <option value="remove_member">Remove member</option>
                  <option value="change_role">Change role</option>
                </select>
              </div>
              {(createType === "add_member" || createType === "remove_member" || createType === "change_role") && (
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <Input value={createUserId} onChange={(e) => setCreateUserId(e.target.value)} placeholder="e.g. 5" className="mt-1" />
                </div>
              )}
              {createType === "add_member" && (
                <div>
                  <label className="text-sm font-medium">In-group handle</label>
                  <Input value={createHandle} onChange={(e) => setCreateHandle(e.target.value)} placeholder="alice" className="mt-1" />
                </div>
              )}
              {createType === "change_role" && (
                <div>
                  <label className="text-sm font-medium">New role</label>
                  <Input value={createHandle} onChange={(e) => setCreateHandle(e.target.value)} placeholder="member | contributor | core | admin" className="mt-1" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Voting period (days)</label>
                <Input type="number" min={1} max={30} value={createVotingDays} onChange={(e) => setCreateVotingDays(parseInt(e.target.value) || 1)} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProposal} disabled={createMutation.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {!proposals?.length ? (
        <p className="text-sm text-muted-foreground">No proposals yet.</p>
      ) : (
        <div className="space-y-2">
          {proposals.map((p: GroupProposal) => (
            <ProposalRow
              key={p.id}
              proposal={p}
              groupId={groupId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onVote={(vote) => voteMutation.mutate({ proposalId: p.id, vote })}
              onTally={() => tallyMutation.mutate(p.id)}
              onExecute={() => executeMutation.mutate(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalRow({
  proposal,
  groupId,
  currentUserId,
  isAdmin,
  onVote,
  onTally,
  onExecute,
}: {
  proposal: GroupProposal;
  groupId: number;
  currentUserId?: number;
  isAdmin: boolean;
  onVote: (vote: "for" | "against" | "abstain") => void;
  onTally: () => void;
  onExecute: () => void;
}) {
  const isPending = proposal.status === "pending";
  const isPassed = proposal.status === "passed";
  const votingEnded = new Date(proposal.votingEndsAt) < new Date();

  return (
    <Card key={proposal.id} className="p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium">{proposal.type.replace("_", " ")}</span>
          <span className="text-muted-foreground ml-2">{JSON.stringify(proposal.payload)}</span>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${proposal.status === "pending" ? "bg-amber-500/20" : proposal.status === "passed" ? "bg-green-500/20" : proposal.status === "executed" ? "bg-blue-500/20" : "bg-muted"}`}>
          {proposal.status}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Voting ends: {new Date(proposal.votingEndsAt).toLocaleString()}
      </p>
      {isPending && votingEnded && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={onTally}>
          Tally votes
        </Button>
      )}
      {isPending && !votingEnded && currentUserId && (
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => onVote("for")}>For</Button>
          <Button size="sm" variant="outline" onClick={() => onVote("against")}>Against</Button>
          <Button size="sm" variant="ghost" onClick={() => onVote("abstain")}>Abstain</Button>
        </div>
      )}
      {isPassed && isAdmin && (
        <Button size="sm" className="mt-2" onClick={onExecute}>
          Execute
        </Button>
      )}
    </Card>
  );
}
