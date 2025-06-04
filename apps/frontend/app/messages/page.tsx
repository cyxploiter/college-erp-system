
'use client';
import React, { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { Message, RealtimeMessagePayload, UserPayload } from '@college-erp/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Assuming added
import { useToast } from "@/components/hooks/use-toast"; // Assuming added
import { format } from 'date-fns';
import { Inbox, Send, AlertCircle, Edit3, Eye, Trash2, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils'; // Added import for cn

const fetchMessages = async (): Promise<Message[]> => {
  const response = await apiClient.get<{ data: Message[] }>('/messages/my');
  return response.data.data;
};

// For admin/faculty to send messages, they might need a list of users
const fetchUsers = async (): Promise<UserPayload[]> => {
    // This endpoint might not exist or might need admin rights.
    // For now, assuming it exists for users with roles 'admin' or 'faculty'.
    // A more realistic endpoint might be '/users' or '/users?role=student&role=faculty' etc.
    // The provided backend has /api/users/me, and no /api/users/all by default for non-admins.
    // We will assume there's an endpoint like '/users/list-for-messaging' or similar.
    // Or, this could be fetched from a more specific admin endpoint if only admin can see all users.
    // For simplicity, let's use a hypothetical endpoint or assume it's handled.
    // If '/users/all' isn't available or protected, this query will fail for non-admins.
    // Let's assume an endpoint '/api/users/contact-list' that returns users one can message.
    const response = await apiClient.get<{data: UserPayload[]}>('/users/all-detailed'); // Using the same one as admin/users page
    return response.data.data;
};


const messageFormSchema = z.object({
  receiverId: z.string().optional().nullable(), // Keep as string for Select component, convert later
  subject: z.string().min(3, "Subject must be at least 3 characters").max(100),
  content: z.string().min(10, "Message content must be at least 10 characters").max(2000),
  type: z.enum(['Direct', 'Broadcast']),
  priority: z.enum(['Normal', 'Urgent', 'Critical']).default('Normal'),
});
type MessageFormValues = z.infer<typeof messageFormSchema>;

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { data: messages, isLoading, error } = useQuery<Message[], Error>({
    queryKey: ['myMessages'],
    queryFn: fetchMessages,
  });

  // Only fetch users if admin/faculty for composing messages
  const { data: users, isLoading: usersLoading } = useQuery<UserPayload[], Error>({
    queryKey: ['allUsersForMessaging'],
    queryFn: fetchUsers,
    enabled: (user?.role === 'admin' || user?.role === 'faculty') && isComposeOpen, // Fetch only when needed and authorized
  });

  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      type: 'Direct',
      priority: 'Normal',
      subject: '',
      content: '',
      receiverId: undefined,
    }
  });

  const sendMessageMutation = useMutation<Message, Error, MessageFormValues>({
    mutationFn: async (newMessageData) => {
      const payload = {
        ...newMessageData,
        receiverId: newMessageData.type === 'Direct' && newMessageData.receiverId ? parseInt(newMessageData.receiverId) : null,
      };
      const response = await apiClient.post<{data: Message}>('/messages', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMessages'] });
      toast({
        title: "Message Sent",
        description: "Your message has been successfully sent.",
        variant: "default", 
        className: "bg-success text-success-foreground border-success" 
      });
      setIsComposeOpen(false);
      messageForm.reset();
    },
    onError: (err) => {
      toast({
        title: "Error Sending Message",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });
  
  const markAsReadMutation = useMutation<void, Error, number>({
    mutationFn: async (messageId) => {
      await apiClient.patch(`/messages/${messageId}/read`);
    },
    onSuccess: (_, messageId) => {
      queryClient.setQueryData<Message[]>(['myMessages'], (oldData) =>
        oldData?.map(msg => msg.id === messageId ? { ...msg, isRead: true } : msg)
      );
    },
    onError: (err) => {
        console.error("Failed to mark message as read:", err.message);
    }
  });

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    // Mark as read only if it's a direct message to the current user and unread
    if (!message.isRead && message.type === 'Direct' && message.receiverId === user?.id) { 
      markAsReadMutation.mutate(message.id);
    }
  };
  
  const onSubmitMessage = (data: MessageFormValues) => {
    if (data.type === 'Direct' && !data.receiverId) {
      messageForm.setError("receiverId", { type: "manual", message: "Receiver is required for direct messages." });
      return;
    }
    sendMessageMutation.mutate(data);
  };

  const getPriorityColor = (priority: Message['priority']) => {
    switch(priority) {
        case 'Critical': return 'border-destructive text-destructive';
        case 'Urgent': return 'border-yellow-500 text-yellow-600'; 
        default: return 'border-primary/50 text-primary'; // Adjusted for better visibility
    }
  };


  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center">
                <Inbox className="mr-3 h-8 w-8 text-primary" />
                Messages
            </h1>
            {(user?.role === 'admin' || user?.role === 'faculty') && (
              <Button onClick={() => setIsComposeOpen(true)}>
                <Edit3 className="mr-2 h-4 w-4" /> Compose Message
              </Button>
            )}
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-[300px] bg-muted p-1 rounded-md">
            <TabsTrigger value="inbox" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Inbox</TabsTrigger>
            <TabsTrigger value="sent" disabled className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Sent (Soon)</TabsTrigger>
          </TabsList>
          <TabsContent value="inbox">
            <Card className="shadow-md mt-4">
              <CardHeader>
                <CardTitle>Your Received Messages</CardTitle>
                <CardDescription>Direct messages and broadcasts will appear here.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && <p className="text-muted-foreground py-4 text-center">Loading messages...</p>}
                {error && <div className="text-destructive bg-destructive/10 p-3 rounded-md flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error: {error.message}</div>}
                {!isLoading && messages && messages.length === 0 && <p className="text-muted-foreground py-4 text-center">Your inbox is empty.</p>}
                {!isLoading && messages && messages.length > 0 && (
                  <ul className="space-y-3">
                    {messages.map((msg) => (
                      <li key={msg.id} 
                          className={cn(
                            "p-3 rounded-md border transition-all hover:shadow-sm cursor-pointer flex justify-between items-start",
                            (msg.isRead && msg.type === 'Direct') || msg.type === 'Broadcast' ? "bg-card border-border" : "bg-primary/5 border-primary/30 font-medium",
                            selectedMessage?.id === msg.id && "ring-2 ring-primary shadow-lg"
                          )}
                          onClick={() => handleViewMessage(msg)}>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center">
                            <span className={cn("text-sm font-semibold", (!msg.isRead && msg.type === 'Direct' && msg.receiverId === user?.id) ? "text-primary" : "text-foreground")}>
                                {msg.type === 'Broadcast' && <Users className="inline h-4 w-4 mr-1.5 text-muted-foreground relative -top-px" />}
                                {msg.subject}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(msg.priority)}`}>{msg.priority}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            From: {msg.sender?.username || 'System'} &bull; {format(new Date(msg.timestamp), "MMM d, yyyy 'at' p")}
                          </p>
                          {selectedMessage?.id === msg.id && (
                              <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="ml-2 flex-shrink-0 h-7 w-7" onClick={(e) => { e.stopPropagation(); handleViewMessage(msg); }}>
                            <Eye className="h-4 w-4 text-muted-foreground"/>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Compose Message Dialog */}
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Compose New Message</DialogTitle>
              <DialogDescription>
                Send a direct message to a user or broadcast to everyone.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={messageForm.handleSubmit(onSubmitMessage)} className="space-y-4 py-2">
              <div>
                <Label htmlFor="type">Message Type</Label>
                 <Controller
                    name="type"
                    control={messageForm.control}
                    render={({ field }) => (
                        <Select onValueChange={(value) => {field.onChange(value); if(value === 'Broadcast') messageForm.setValue('receiverId', null);}} defaultValue={field.value}>
                            <SelectTrigger id="type" className="w-full mt-1">
                                <SelectValue placeholder="Select message type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Direct">Direct Message</SelectItem>
                                <SelectItem value="Broadcast">Broadcast Announcement</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
              </div>

              {messageForm.watch("type") === "Direct" && (
                <div>
                  <Label htmlFor="receiverId">Recipient</Label>
                   <Controller
                        name="receiverId"
                        control={messageForm.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <SelectTrigger id="receiverId" className="w-full mt-1" disabled={usersLoading || !users}>
                                    <SelectValue placeholder={usersLoading? "Loading users..." : "Select recipient"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {users?.filter(u => u.id !== user?.id).map(u => ( 
                                        <SelectItem key={u.id} value={String(u.id)}>{u.username} ({u.role})</SelectItem>
                                    ))}
                                     {!usersLoading && (!users || users.filter(u => u.id !== user?.id).length === 0) && <p className="p-2 text-xs text-muted-foreground">No users available to message.</p>}
                                </SelectContent>
                            </Select>
                        )}
                    />
                  {messageForm.formState.errors.receiverId && <p className="text-xs text-destructive mt-1">{messageForm.formState.errors.receiverId.message}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...messageForm.register("subject")} className="mt-1" />
                {messageForm.formState.errors.subject && <p className="text-xs text-destructive mt-1">{messageForm.formState.errors.subject.message}</p>}
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" {...messageForm.register("content")} className="mt-1 min-h-[100px]" />
                {messageForm.formState.errors.content && <p className="text-xs text-destructive mt-1">{messageForm.formState.errors.content.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                 <Controller
                    name="priority"
                    control={messageForm.control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="priority" className="w-full mt-1">
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Normal">Normal</SelectItem>
                                <SelectItem value="Urgent">Urgent</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {setIsComposeOpen(false); messageForm.reset();}}>Cancel</Button>
                <Button type="submit" disabled={sendMessageMutation.isPending || (messageForm.watch("type") === "Direct" && usersLoading)}>
                  {sendMessageMutation.isPending ? <><Send className="mr-2 h-4 w-4 animate-pulse" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}
