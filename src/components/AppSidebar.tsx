// src/components/AppSidebar.tsx
import { Home, Users, GraduationCap, DollarSign, LogOut, Briefcase } from "lucide-react";
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
];

// src/components/AppSidebar.tsx (Relevant Snippet)
// ...imports including cn from "@/lib/utils"

// ...menuItems array...

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>School Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? item.title : undefined}
                   >
                    <NavLink
                      to={item.url}
                      // Use 'end' prop for exact matching on base route "/" if needed
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2", // Base styles for layout
                          // Conditional styles for active link
                          isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
    </Sidebar>
  );
};