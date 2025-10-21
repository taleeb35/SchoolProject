// src/components/AppSidebar.tsx
import { Home, Users, GraduationCap, DollarSign, LogOut, Briefcase, UserCircle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Classes", url: "/classes", icon: GraduationCap },
  { title: "Students", url: "/students", icon: Users },
  { title: "Employees", url: "/employees", icon: Briefcase },
  { title: "Fee Management", url: "/fees", icon: DollarSign },
  { title: "Expenses & Profit/Loss", url: "/expenses", icon: DollarSign },
  { title: "Profile", url: "/profile", icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";

  return (
    // You can adjust the width here if needed, or keep it dynamic
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          {/* Label is hidden when collapsed */}
          <SidebarGroupLabel>School Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isExactMatch = item.url === "/";
                return (
                  <SidebarMenuItem key={item.title}>
                    <NavLink
                      to={item.url}
                      end={isExactMatch}
                      className={({ isActive }) =>
                        cn(
                          isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <SidebarMenuButton
                          tooltip={collapsed ? item.title : undefined}
                          isActive={isActive}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
              {/* Sign Out Button */}
               <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  tooltip={collapsed ? "Sign Out" : undefined}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Optional: Add SidebarFooter if needed */}
    </Sidebar>
  );
};