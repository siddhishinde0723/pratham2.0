import React, { useEffect, useState } from 'react';

import {
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  SelectChangeEvent,
  Box,
} from '@mui/material';
import { findCommonAssociations, getAssociationsByName, getOptionsByCategory } from '@/utils/Helper';
import useTenantConfig from "@/hooks/useTenantConfig";
interface FrameworkCategoriesProps {
  initialBoard?: string;  
  initialMedium?: string;  
  initialGrade?: string;
  customFormData: any;
  onFieldsChange: (fields: any) => void;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
}

const FrameworkCategories: React.FC<FrameworkCategoriesProps> = ({
  initialBoard,  
  initialMedium,
  initialGrade,
  customFormData,
  onFieldsChange,
  setShowForm,
}) => {
  const tenantConfig = useTenantConfig();
  const [framework, setFramework] = useState<any[]>([]);
  const [boardOptions, setBoardOptions] = useState<any[]>([]);
  const [boardAssociations, setBoardAssociations] = useState<any[]>([]);
  const [mediumOptions, setMediumOptions] = useState<any[]>([]);
  const [mediumAssociations, setMediumAssociations] = useState<any[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>(initialBoard || '');
  const [selectedMedium, setSelectedMedium] = useState<string>(initialMedium || '');
  const [gradeOptions, setGradeOptions] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade || '');
  const [selectedState, setSelectedState] = useState<string>('');

  const res = customFormData;
  function extractFieldIds(data: any) {
    const fieldsOfInterest = ['board', 'medium', 'grade', 'subject'];
    const fieldIds: { [key: string]: string } = {};

    data?.fields?.forEach((field: { name: string; fieldId: string }) => {
      if (fieldsOfInterest.includes(field.name)) {
        fieldIds[field.name] = field.fieldId;
      }
    });

    return fieldIds;
  }
  const fieldIds = extractFieldIds(res); 

  useEffect(() => {
    if (fieldIds) {
      const arrangedData = {
        board: {
          fieldId: fieldIds.board,
          boardName: selectedBoard,
        },
        medium: {
          fieldId: fieldIds.medium,
          mediumName: selectedMedium,
        },
        grade: {
          fieldId: fieldIds.grade,
          gradeName: selectedGrade,
        },
      }; 
      if (selectedBoard && selectedMedium && selectedGrade && arrangedData) {
        localStorage.setItem('BMGSData', JSON.stringify(arrangedData));
      }
    }
  }, [selectedBoard, selectedMedium, selectedGrade]);

  useEffect(() => {
    if (!tenantConfig?.COLLECTION_FRAMEWORK) return;
    const handleBMGS = async () => {
      // const userStateName = localStorage.getItem('stateName');
      try {
        const url = `/api/framework/v1/read/${tenantConfig?.COLLECTION_FRAMEWORK}`;
        const boardData = await fetch(url).then((res) => res.json());
        const frameworks = boardData?.result?.framework;
        setFramework(frameworks);
        const getBoards = getOptionsByCategory(frameworks, 'board'); 
        const userInfoString = localStorage.getItem('adminInfo');
        const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
        const boardField = userInfo?.customFields?.find((field: any) => field.label === "BOARD");
        const boardValue = boardField ? boardField.value : null;


        if (boardValue !== null) {
          const userBoards = boardValue.split(",");
          if (getBoards && userBoards) {
            const normalizedUserBoards = userBoards.map((board: string) => board.toLowerCase());       
            const matchingBoards = getBoards?.filter((board: { name: string; }) =>
              normalizedUserBoards.includes(board.name.toLowerCase())
            );
            setBoardOptions(matchingBoards);
          }
        } else if (getBoards) {
          setBoardOptions(getBoards);
        }
      } catch (error) {
        console.error('Error fetching board data:', error);
      }
    };
    handleBMGS();
  }, [tenantConfig]);

  useEffect(() => {
    if (selectedBoard && Object.keys(framework).length) {
      const getMedium = getOptionsByCategory(framework, 'medium');
      const boardAssociations = getAssociationsByName(boardOptions, selectedBoard);
      setBoardAssociations(boardAssociations);
  
      const commonMediumInState = getMedium?.map((item1: { name: any; code: any; associations: any; }) => ({
        name: item1.name,
        code: item1.code,
        associations: item1.associations,
      }));
  
      const commonMediumInBoard = getMedium
        ?.filter((item1: { code: string; }) =>
          boardAssociations?.some(
            (item2) => item2.code === item1.code && item2.category === 'medium'
          )
        )
        ?.map((item1: { name: any; code: any; associations: any; }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        }));
  
      const commonMediumData = findCommonAssociations(
        commonMediumInState,
        commonMediumInBoard
      );
  
      setMediumOptions(commonMediumData);
  
      if (initialMedium && commonMediumData?.some((m) => m?.name === initialMedium)) {
        setSelectedMedium(initialMedium);
        setShowForm(false);
      }
    }
  }, [selectedBoard, framework]);
  
  useEffect(() => {
    if (selectedMedium && Object.keys(framework).length) {
      const getGrades = getOptionsByCategory(framework, 'gradeLevel');
      const mediumAssociations = getAssociationsByName(mediumOptions, selectedMedium);
      setMediumAssociations(mediumAssociations);
  
      const commonGradeInState = getGrades?.map((item1: { name: any; code: any; associations: any; }) => ({
        name: item1.name,
        code: item1.code,
        associations: item1.associations,
      }));
  
      const commonGradeInBoard = getGrades
        ?.filter((item1: { code: any; }) =>
          boardAssociations?.some(
            (item2) => item2.code === item1.code && item2.category === 'gradeLevel'
          )
        )
        ?.map((item1: { name: any; code: any; associations: any; }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        }));
  
      const commonGradeInMedium = getGrades
        ?.filter((item1: { code: string; }) =>
          mediumAssociations?.some(
            (item2) => item2.code === item1.code && item2.category === 'gradeLevel'
          )
        )
        ?.map((item1: { name: any; code: any; associations: any; }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        }));
  
      const commonGradeInStateBoard = findCommonAssociations(
        commonGradeInState,
        commonGradeInBoard
      );
      const overAllCommonGrade = findCommonAssociations(
        commonGradeInStateBoard,
        commonGradeInMedium
      );
  
      setGradeOptions(overAllCommonGrade);
  
      if (initialGrade && overAllCommonGrade?.some((g) => g?.name === initialGrade)) {
        setSelectedGrade(initialGrade);
        setShowForm(true);
      }
    }
  }, [selectedMedium, framework]);
  
  const handleBoardChange = (event: SelectChangeEvent<string>) => {
    const board = event.target.value;
    setSelectedBoard(board); 
    setSelectedMedium('');
    setMediumOptions([]);
    setGradeOptions([]);
    setSelectedGrade('');
    setShowForm(false);

    if (board) {
      const getMedium = getOptionsByCategory(framework, 'medium');
      const boardAssociations = getAssociationsByName(boardOptions, board);
      setBoardAssociations(boardAssociations);

      const commonMediumInState = getMedium
        ?.map((item1: { name: string; code: string; associations: any[] }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        }));

      const commonMediumInBoard = getMedium
        ?.filter((item1: { code: any }) =>
          boardAssociations?.some(
            (item2: { code: any; category: string }) =>
              item2.code === item1.code && item2.category === 'medium'
          )
        )
        ?.map((item1: { name: any; code: any; associations: any }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        })); 

      const commonMediumData = findCommonAssociations(
        commonMediumInState,
        commonMediumInBoard
      );
      setMediumOptions(commonMediumData);
    }
  };

  const handleMediumChange = (event: SelectChangeEvent<string>) => {
    const medium = event.target.value;
    setSelectedMedium(medium);
    setSelectedGrade('');
    setGradeOptions([]);
    setShowForm(false); 
    if (medium) {
      const getGrades = getOptionsByCategory(framework, 'gradeLevel');
      const mediumAssociations = getAssociationsByName(mediumOptions, medium); 
      setMediumAssociations(mediumAssociations);

      const commonGradeInState = getGrades
        ?.map((item1: { name: string; code: string; associations: any[] }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        }));

      const commonGradeInBoard = getGrades
        ?.filter((item1: { code: any }) =>
          boardAssociations?.some(
            (item2: { code: any; category: string }) =>
              item2.code === item1.code && item2.category === 'gradeLevel'
          )
        )
        ?.map((item1: { name: any; code: any; associations: any }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        }));

      const commonGradeInMedium = getGrades
        ?.filter((item1: { code: any }) =>
          mediumAssociations?.some(
            (item2: { code: any; category: string }) =>
              item2.code === item1.code && item2.category === 'gradeLevel'
          )
        )
        ?.map((item1: { name: any; code: any; associations: any }) => ({
          name: item1.name,
          code: item1.code,
          associations: item1.associations,
        })); 

      const commonGradeInStateBoard = findCommonAssociations(
        commonGradeInState,
        commonGradeInBoard
      );
      const overAllCommonGrade = findCommonAssociations(
        commonGradeInStateBoard,
        commonGradeInMedium
      );
      setGradeOptions(overAllCommonGrade);
    }
  };

  const handleGradeChange = (event: SelectChangeEvent<string>) => {
    const grade = event.target.value;
    setSelectedGrade(grade); 

    if (selectedBoard && selectedMedium && grade) {
      setShowForm(true);
    }
    onFieldsChange({
      board: selectedBoard,
      medium: selectedMedium,
      grade: grade,
    });
  };

  return (
    <Box>
      {/* Board dropdown */}
      {boardOptions && (
        <FormControl fullWidth variant="outlined" margin="normal">
          <InputLabel id="board-select-label">Board</InputLabel>
          <Select
            labelId="board-select-label"
            onChange={handleBoardChange}
            value={selectedBoard}
            defaultValue=""
            label="Board"
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: "240px",
                },
              },
            }}
          >
            {boardOptions?.map((option: any) => (
              <MenuItem key={option.code} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

      )}

      {/* Medium dropdown */}
      <FormControl
        fullWidth
        variant="outlined"
        margin="normal"
        disabled={!selectedBoard}
      >
        <InputLabel id="medium-select-label">Medium</InputLabel>
        <Select
          labelId="medium-select-label"
          onChange={handleMediumChange}
          value={selectedMedium}
          defaultValue=""
          label="Medium"
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: "240px",
              },
            },
          }}
        >
          {mediumOptions?.map((option) => (
            <MenuItem key={option.code} value={option.name}>
              {option.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Grade dropdown */}
      <FormControl
        fullWidth
        variant="outlined"
        margin="normal"
        disabled={!selectedMedium}
      >
        <InputLabel id="grade-select-label">Grade</InputLabel>
        <Select
          labelId="grade-select-label"
          onChange={handleGradeChange}
          value={selectedGrade}
          defaultValue=""
          label="Grade"
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: "240px",
              },
            },
          }}
        >
          {gradeOptions?.map((option) => (
            <MenuItem key={option.code} value={option.name}>
              {option.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default FrameworkCategories;
