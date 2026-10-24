import { useNavigate } from "react-router-dom";
import { useAuthLogoutMutation } from "@/api/autogen/workdesk";
import { api } from "@/api/api";
import { store } from "@/app/store";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export default function useSignOut() {
    const [logout, state] = useAuthLogoutMutation();
    const navigate = useNavigate();
    const setScope = useWorkspaceStore((value) => value.setScope);
    async function signOut() {
        await logout().unwrap();
        setScope("mine");
        store.dispatch(api.util.resetApiState());
        navigate("/login", { replace: true });
    }
    return { signOut, ...state };
}
