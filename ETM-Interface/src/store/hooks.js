// File: src/store/hooks.js
// Purpose: Provides shared access helpers for Redux hooks.
// Imports: useDispatch and useSelector.
// Behavior: Screens use these helpers instead of wiring Redux manually.
import { useDispatch, useSelector } from "react-redux";

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
