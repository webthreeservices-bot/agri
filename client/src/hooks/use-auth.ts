import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type User, type InsertUser, type LoginRequest } from "@shared/schema";
import { ethers } from "ethers";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const token = null;

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user/me", {
          headers: {
            "Accept": "application/json"
          }
        });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await res.json();
        }
        return null;
      } catch (e) {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        let errorMessage = "Login failed";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          }
        } catch (e) {
          // Fallback if not JSON
        }
        throw new Error(errorMessage);
      }
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }
      throw new Error("Server returned non-JSON response");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user/me"], data.user);
      queryClient.invalidateQueries(); 
      toast({
        title: "Welcome back!",
        description: `Connected as ${data.user.walletAddress.slice(0, 6)}...`,
      });
    },
    onError: (error) => {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const connectWallet = async (sponsorAddress?: string) => {
    if (!window.ethereum) {
      toast({
        title: "Metamask Required",
        description: "Please install Metamask to use this application",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      if (!window.ethereum) {
        throw new Error("No ethereum provider found");
      }

      // First check if already connected
      let accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      // If not connected, request accounts
      if (!accounts || accounts.length === 0) {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in wallet. Please unlock MetaMask.");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      const message = "Login to AgriTrade";
      const signature = await signer.signMessage(message);

      try {
        await loginMutation.mutateAsync({
          walletAddress: address,
          signature,
          sponsorAddress,
        });
      } catch (loginErr: any) {
        if (loginErr.message === "User not found") {
          // If login fails because user not found, try to register
          const res = await fetch("/api/register", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              walletAddress: address,
              signature,
              sponsorAddress: sponsorAddress || "0x0000000000000000000000000000000000000000",
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || "Registration failed");
          }

          const data = await res.json();
          queryClient.setQueryData(["/api/user/me"], data.user);
          queryClient.invalidateQueries();
          toast({
            title: "Welcome!",
            description: `Registered as ${data.user.walletAddress.slice(0, 6)}...`,
          });
        } else {
          throw loginErr;
        }
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Connection Failed",
        description: err.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const demoLogin = async () => {
    try {
      setIsConnecting(true);
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error("Demo login failed");
      }

      const data = await res.json();
      queryClient.setQueryData(["/api/user/me"], data.user);
      queryClient.invalidateQueries(); // Refresh everything
      toast({
        title: "Demo Login Successful!",
        description: `Connected as ${data.user.walletAddress.slice(0, 6)}...`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Demo Login Failed",
        description: err.message || "Failed to login",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user/me"], null);
      queryClient.invalidateQueries();
      toast({ title: "Logged out" });
    },
  });

  return {
    user,
    isLoadingUser,
    connectWallet,
    demoLogin,
    isConnecting,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
  };
}
