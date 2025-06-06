
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { Inbox, Send, AlertCircle, Edit3, Eye, Trash2, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils'; 

const fetchMessages = async (): Promise<Message[]> => {
  const response = await apiClient.get<{ data: Message[] }>('/messages/my');
  return response.data.data;
};

const fetchUsersForMessaging = async (): Promise<UserPayload[]> => {
    const response = await apiClient.get<{data: UserPayload[]}>('/users'); 
    return response.data.data;
};


const messageFormSchema = z.object({
  receiverId: z.string().optional().nullable(), 
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

  const { data: usersForSelect, isLoading: usersLoading } = useQuery<UserPayload[], Error>({
    queryKey: ['usersForMessagingList'],
    queryFn: fetchUsersForMessaging,
    enabled: (user?.role === 'admin' || user?.role === 'faculty') && isComposeOpen, 
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
    if (!message.isRead && (message.receiverId === user?.id || message.type === 'Broadcast')) {
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
        default: return 'border-primary/50 text-primary';
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
              <Button onClick={() => { messageForm.reset({ type: 'Direct', priority: 'Normal' }); setIsComposeOpen(true); }}>
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
                            (msg.isRead && msg.receiverId === user?.id ) || msg.type === 'Broadcast' ? "bg-card border-border" : "bg-primary/5 border-primary/30 font-medium",
                            selectedMessage?.id === msg.id && "ring-2 ring-primary shadow-lg"
                          )}
                          onClick={() => handleViewMessage(msg)}>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center">
                            <span className={cn("text-sm font-semibold", (!msg.isRead && msg.receiverId === user?.id && msg.type==='Direct') ? "text-primary" : "text-foreground")}>
                                {msg.type === 'Broadcast' && <Users className="inline h-4 w-4 mr-1.5 text-muted-foreground relative -top-px" />}
                                {msg.subject}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(msg.priority)}`}>{msg.priority}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {/* The Message model's sender is Partial<User>, which has 'name' */}
                            From: {msg.sender?.name || 'System'} &bull; {format(new Date(msg.timestamp), "MMM d, yyyy 'at' p")}
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

        <Dialog open={isComposeOpen} onOpenChange={(open) => { setIsComposeOpen(open); if (!open) messageForm.reset();}}>
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
                        <Select onValueChange={(value) => {field.onChange(value); if(value === 'Broadcast') messageForm.setValue('receiverId', null);}} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <SelectTrigger id="receiverId" className="w-full mt-1" disabled={usersLoading || !usersForSelect}>
                                    <SelectValue placeholder={usersLoading? "Loading users..." : "Select recipient"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* usersForSelect contains UserPayload, which has 'name' */}
                                    {usersForSelect?.filter(u => u.id !== user?.id).map(u => ( 
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.role})</SelectItem>
                                    ))}
                                     {!usersLoading && (!usersForSelect || usersForSelect.filter(u => u.id !== user?.id).length === 0) && <p className="p-2 text-xs text-muted-foreground">No users available to message.</p>}
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
                        <Select onValueChange={field.onChange} value={field.value}>
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