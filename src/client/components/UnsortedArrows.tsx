import { ArrowDownward, ArrowUpward } from "@mui/icons-material";
import { SortArrows } from "./styles"

export const UnsortedArrows: React.FC = () => {
    return <SortArrows>
        <ArrowUpward />
        <ArrowDownward />
    </SortArrows>;
};