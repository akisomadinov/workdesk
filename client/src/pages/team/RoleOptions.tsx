import { Box, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import { editableRoles } from "./roles";
export default function RoleOptions({
    value,
    onChange,
    disabled
}: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <RadioGroup
            value={value}
            onChange={(_, role) => onChange(role)}
            aria-label="Права участника"
            sx={{ gap: 0.75 }}
        >
            {editableRoles.map((role) => (
                <FormControlLabel
                    key={role.value}
                    value={role.value}
                    disabled={disabled}
                    control={<Radio size="small" />}
                    sx={{
                        m: 0,
                        p: 0.5,
                        pr: 1.5,
                        border: 1,
                        borderRadius: 1.5,
                        borderColor: value === role.value ? "primary.main" : "divider",
                        alignItems: "start"
                    }}
                    label={
                        <Box sx={{ py: 0.75 }}>
                            <Typography variant="body2" fontWeight={600}>
                                {role.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {role.description}
                            </Typography>
                        </Box>
                    }
                />
            ))}
        </RadioGroup>
    );
}
